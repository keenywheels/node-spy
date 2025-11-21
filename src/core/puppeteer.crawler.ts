import puppeteer from 'puppeteer';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import { Session } from '../entites/session';
import { Logger } from '../utils/logger';
import { KafkaBroker } from './kafka.broker';
import { JSDOMParser } from './jsdom.parser';

// Initialize the stealth plugin
puppeteerExtra.use(StealthPlugin());

export class PuppeteerSessionStealer {
    private browser: Browser | null = null;
    private page: Page | null = null;

    constructor(
        private readonly config: {
            originUrl: string;
            minInitTime: number;
            browserArgs: string[];
        },
        private logger: Logger
    ){}

    async init() {
        this.logger.info("Starting init session stealer");
        this.browser = await puppeteer.launch({
            headless: false,
            defaultViewport: {width: 1920, height: 1080},
            args: this.config.browserArgs
        });

        this.page = await this.browser.newPage();

        try {
            const startTime: Date = new Date;
            await this.page.goto(this.config.originUrl, { 
                waitUntil: "domcontentloaded",
                timeout: 60000 
            });
            const endTime: Date = new Date;
            const timeDiff = endTime.getTime() - startTime.getTime();
            if (timeDiff < this.config.minInitTime) {
                await delay(this.config.minInitTime - timeDiff);
            }

            /* await this.takeScreenshot(); */
            this.logger.info("Successfully init session stealer");
        } catch (error) {
            await this.closeBrowser();
            throw new Error(`Failed to init session stealer: ${error}`);
        }
    }

    async saveSession(): Promise<Session> {
        try {
            const cookies = await this.browser!.cookies();
            const localStorage = await this.getLocalStorage(this.page!);
            const sessionStorage = await this.getSessionStorage(this.page!);

            await this.closeBrowser();

            return new Session(
                new Date(),
                cookies,
                localStorage,
                sessionStorage
            );
        } catch (error) {
            await this.closeBrowser();
            throw new Error(`Failed to save session: ${error}`);
        }
    }

    private async closeBrowser(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    private async getLocalStorage(page: Page): Promise<Map<string, string>> {
        const storage = await page.evaluate(() => {
            const items = new Map<string, string>();
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key) {
                    items.set(key, localStorage.getItem(key) || '');
                }
            }
            return Object.fromEntries(items);
        });
        return new Map(Object.entries(storage));
    }

    private async getSessionStorage(page: Page): Promise<Map<string, string>> {
        const storage = await page.evaluate(() => {
            const items = new Map<string, string>();
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                if (key) {
                    items.set(key, sessionStorage.getItem(key) || '');
                }
            }
            return Object.fromEntries(items);
        });
        return new Map(Object.entries(storage));
    }

    private async takeScreenshot() {
        try {
            await this.page!.screenshot({ path: "screenshot.png", fullPage: true });
            this.logger.info("Saved screenshot.png");
        } catch (e) {this.logger.error('error:', e as Error)}
    }
}

export class PuppeteerCrawler {
    private browser: Browser | null = null;
    private page: Page | null = null;

    constructor(
        private readonly config: {
            originUrl: string;
            siteName: string;
            maxDepth: number;
            requestDelay: number;
            waitSPA: number;
            browserArgs: string[];
        },
        private parser: JSDOMParser,
        private broker: KafkaBroker,
        private logger: Logger
    ){}

    async init(session: Session) {
        this.browser = await puppeteerExtra.launch({
            headless: true,
            defaultViewport: {width: 1920, height: 1080},
            args: this.config.browserArgs
        });

        this.page = await this.browser.newPage();
        
        this.logger.setupPageLogging(this.page);
            
        try {
            await this.browser.setCookie(...session.cookies);
            await this.page.goto(this.config.originUrl, { waitUntil: "domcontentloaded" });
            await this.setLocalStorage(this.page, session.localStorage);
            await this.setSessionStorage(this.page, session.sessionStorage);
            this.logger.info("Successfully init crawler");
        } catch (error) {
            await this.closeBrowser();
            throw new Error(`Failed to init crawler: ${error}`);
        }
    }

    async run(): Promise<void> {
        try {
            await this.visitPage(this.config.originUrl, 0);
            await this.closeBrowser();
        } catch (error) {
            await this.closeBrowser();
            throw new Error(`Failed to run crawler: ${error}`);
        }
    }

    private async visitPage(url: string, depth: number): Promise<void> {
        if (this.isMaxDepthReached(depth)) {
            this.logger.debug(`Max depth ${depth} reached for ${url}`);
            return;
        }

        try {
            this.logger.info(`VISITING (depth ${depth}): ${url}`);
            
            const startTime = performance.now();
            await this.page!.goto(url, { waitUntil: 'domcontentloaded' });
            const endTime = performance.now();
            const execTime = endTime - startTime;
            this.logger.debug(`${url} visited in ${execTime}`);
            if (execTime < this.config.waitSPA) {
                await delay(this.config.waitSPA - execTime);
            }
            // await this.takeScreenshot("after");

            const content = await this.page!.content();
            const extractedText = this.parser.parseHTML(content);
            
            await this.broker.producerSend(this.config.siteName, extractedText.join(' '));

            if (!this.isMaxDepthReached(depth + 1)) {
                const links = this.parser.extractLinks(content)
                    .filter(link => this.isSameSecondLevelDomain(link));

                this.logger.debug(`Found ${links.length} valid links on ${url}`);

                for (const link of links) {
                    await delay(this.config.requestDelay);
                    try {
                        await this.visitPage(link, depth + 1);
                    } catch (error: any) {
                        this.logger.error(`Failed to visit ${link}`, error as Error);
                    }
                }
            }

            return;
        } catch (error) {
            this.logger.error(`Failed to visit page ${url}`, error as Error);
            throw error;
        }
    }

    private async closeBrowser(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    private async setLocalStorage(page: Page, storage: Map<string, string>): Promise<void> {
        await page.evaluate((items) => {
            localStorage.clear();
            for (const [key, value] of Object.entries(items)) {
                localStorage.setItem(key, value);
            }
        }, Object.fromEntries(storage));
    }

    private async setSessionStorage(page: Page, storage: Map<string, string>): Promise<void> {
        await page.evaluate((items) => {
            sessionStorage.clear();
            for (const [key, value] of Object.entries(items)) {
                sessionStorage.setItem(key, value);
            }
        }, Object.fromEntries(storage));
    }

    private isMaxDepthReached(depth: number): boolean {
        return depth > this.config.maxDepth;
    }

    private isSameSecondLevelDomain(url: string): boolean {
        try {
            const targetHost = new URL(this.config.originUrl).hostname; // например: www.wildberries.ru
            const urlHost = new URL(url).hostname;
    
            // достаём домен второго уровня (SLD + TLD)
            const getSLD = (host: string) => host.split('.').slice(-2).join('.');
    
            return getSLD(targetHost) === getSLD(urlHost);
        } catch {
            return false;
        }
    }

    private formatUrlForFilename(url: string, depth: number): string {
        const urlSafe = url.replace(/[^\w]/g, '_').toLowerCase();
        return `depth_${depth}/${urlSafe}`;
    }

    private async takeScreenshot(name: string = "screenshot") {
        try {
            await this.page!.screenshot({ path: `${name}.png`, fullPage: true });
            this.logger.info("Saved screenshot.png");
        } catch (e) {this.logger.error('error:', e as Error)}
    }
}

/**
 * For requests delay
 */
async function delay(msec: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, msec));
}