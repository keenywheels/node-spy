import puppeteer from 'puppeteer';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import { BaseCrawler } from '../../core/services/base.crawler';
import { IParser } from '../../core/interfaces/parser.interface';
import { IStorage } from '../../core/interfaces/storage.interface';
import { Session } from '../../core/entities/session';
import { Webpage } from '../../core/entities/webpage';
import { Logger } from 'src/utils/logger';
import { KafkaBroker } from './kafka.broker';

const MAX_CONCURRENT_REQUESTS = 1;

// Initialize the stealth plugin
puppeteerExtra.use(StealthPlugin());

export class PuppeteerCrawler extends BaseCrawler {
    private browser: Browser | null = null;
    private page: Page | null = null;
    private logger: Logger;
    private broker: KafkaBroker;

    constructor(
        parser: IParser,
        storage: IStorage,
        protected readonly config: {
            originUrl: string;
            targetUrl: string;
            maxDepth: number;
            requestDelay: number;
            browserArgs: string[];
            viewport: { width: number; height: number };
            headless: boolean;
        },
        logger: Logger,
        broker: KafkaBroker
    ) {
        super(parser, storage, config);
        this.logger = logger;
        this.broker = broker;
    }

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

            await this.page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36');

            const cookies = await this.page.cookies();
            const localStorage = await this.getLocalStorage(this.page);
            const sessionStorage = await this.getSessionStorage(this.page);

            /* try {
                await this.page.screenshot({ path: 'ozon_restored.png', fullPage: true });
                console.log('Saved screenshot ozon_restored.png');
            } catch (e) {} */

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
            
            await this.page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36');

            await this.page.setCookie(...session.cookies);
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
            const metadata = this.parser.extractMetadata(content);
            
            const webpage = new Webpage(url, depth, content, extractedText);
            //await this.storage.saveWebpage(webpage);
            await this.broker.producerSend(webpage.extractedText.join(" "));

            if (!this.isMaxDepthReached(depth + 1)) {
                const links = this.parser.extractLinks(content)
                    .filter(link => this.isSameDomain(link));

                this.logger.debug(`Found ${links.length} valid links on ${url}`);

                // Разбиваем массив ссылок на чанки для параллельной обработки
                const chunks = this.chunkArray(links, MAX_CONCURRENT_REQUESTS);

                // Обрабатываем чанки последовательно
                for (const chunk of chunks) {
                    await Promise.all(
                        chunk.map(async (link) => {
                            await this.delay();//1000 + Math.random() * this.config.requestDelay);
                            try {
                                await this.visitPage(link, depth + 1);
                            } catch (error: any) {
                                this.logger.error(`Failed to visit ${link}`, error as Error);
                                if (error.message.includes('net::ERR_ABORTED')) {
                                    this.logger.warn(`Navigation aborted for ${url}, retrying...`);
                                    await this.delay(1000 + Math.random() * this.config.requestDelay);
                                    return this.visitPage(url, depth + 1);
                                }
                            }
                        })
                    );
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
                args: this.config.browserArgs,
                defaultViewport: this.config.viewport
            });
        } else {
            this.browser = await puppeteerExtra.launch({
                headless: true,
                args: this.config.browserArgs,
                defaultViewport: this.config.viewport
            });
        }

        const page = await this.browser.newPage();
        
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

    private chunkArray<T>(array: T[], size: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
}