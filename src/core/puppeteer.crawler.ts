import puppeteer from 'puppeteer';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import { Session } from '../entites/session';
import { Webpage } from '../entites/webpage';
import { Logger } from '../utils/logger';
import { KafkaBroker } from './kafka.broker';
import { JSDOMParser } from './jsdom.parser';
import { FileStorage } from './file.storage';

// Initialize the stealth plugin
puppeteerExtra.use(StealthPlugin());

export class PuppeteerCrawler {
    private browser: Browser | null = null;
    private page: Page | null = null;

    constructor(
        private parser: JSDOMParser,
        private storage: FileStorage,
        private logger: Logger,
        private broker: KafkaBroker,
        private readonly config: {
            originUrl: string;
            targetUrl: string;
            maxDepth: number;
            requestDelay: number;
            browserArgs: string[];
        }
    ){}

    async saveSession(): Promise<Session> {
        try {
            this.page = await this.initBrowser(false);
            const startTime: Date = new Date;
            await this.page.goto(this.config.originUrl, { 
                waitUntil: "domcontentloaded",
                timeout: 60000 
            });
            const endTime: Date = new Date;
            const timeDiff = endTime.getTime() - startTime.getTime();
            if (timeDiff < 5000) {
                await this.delay(5000 - timeDiff);
            }

            const cookies = await this.browser!.cookies();
            const localStorage = await this.getLocalStorage(this.page);
            const sessionStorage = await this.getSessionStorage(this.page);

            //this.takeScreenshot();

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

    async useSession(session: Session): Promise<void> {
        try {
            this.page = await this.initBrowser(true);
            
            await this.browser!.setCookie(...session.cookies);
            await this.page.goto(this.config.originUrl, { waitUntil: 'domcontentloaded' });
            await this.setLocalStorage(this.page, session.localStorage);
            await this.setSessionStorage(this.page, session.sessionStorage);

            await this.visitPage(this.config.targetUrl, 0);
            
            await this.closeBrowser();
        } catch (error) {
            await this.closeBrowser();
            throw new Error(`Failed to use session: ${error}`);
        }
    }

    async visitPage(url: string, depth: number): Promise<Webpage> {
        if (this.isMaxDepthReached(depth)) {
            this.logger.warn(`Max depth ${depth} reached for ${url}`);
            throw new Error(`Max depth ${depth} reached for ${url}`);
        }

        const page = this.page!;
        try {
            this.logger.info(`→ VISITING (depth ${depth}): ${url}`);
            
            await page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });

            const content = await page.content();
            const extractedText = this.parser.parseHTML(content);
            
            const webpage = new Webpage(url, depth, content, extractedText);

            //const pageText = await page.evaluate(() => document.body.innerText);
            //console.log(pageText);
            await this.broker.producerSend(webpage.extractedText.join(" "));

            if (!this.isMaxDepthReached(depth + 1)) {
                const links = this.parser.extractLinks(content)
                    .filter(link => this.isSameDomain(link));

                this.logger.debug(`Found ${links.length} valid links on ${url}`);

                for (const link of links) {
                    await this.delay();
                    try {
                        await this.visitPage(link, depth + 1);
                    } catch (error: any) {
                        this.logger.error(`Failed to visit ${link}`, error as Error);
                    }
                }
            }

            return webpage;
        } catch (error) {
            this.logger.error(`Failed to visit page ${url}`, error as Error);
            throw error;
        }
    }

    private async initBrowser(headless: boolean): Promise<Page> {
        if (!headless) {
            this.browser = await puppeteer.launch({
                headless: false,
                args: this.config.browserArgs
            });
        } else {
            this.browser = await puppeteerExtra.launch({
                headless: true,
                args: this.config.browserArgs
            });
        }

        const page = await this.browser!.newPage();
        
        this.logger.setupPageLogging(page);
        
        return page;
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

    protected isMaxDepthReached(depth: number): boolean {
        return depth > this.config.maxDepth;
    }

    /**
     * Проверяет, принадлежит ли URL тому же домену
     */
    protected isSameDomain(url: string): boolean {
        try {
            const targetOrigin = new URL(this.config.originUrl).origin;
            const urlOrigin = new URL(url).origin;
            return urlOrigin === targetOrigin;
        } catch {
            return false;
        }
    }

    /**
     * Задержка между запросами
     */
    protected async delay(msec: number = this.config.requestDelay): Promise<void> {
        await new Promise(resolve => setTimeout(resolve, msec));
    }

    /**
     * Форматирует URL для использования в качестве имени файла
     */
    protected formatUrlForFilename(url: string, depth: number): string {
        const urlSafe = url.replace(/[^\w]/g, '_').toLowerCase();
        return `depth_${depth}/${urlSafe}`;
    }

    private async takeScreenshot(filename: string = 'screenshot') {
        try {
            await this.page!.screenshot({ path: `${filename}.png`, fullPage: true });
            console.log(`Saved screenshot ${filename}.png`);
        } catch (e) {console.log('error:', e as Error)}
    }
}