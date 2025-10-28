import { Config } from './infrastructure/config/config';
import { PuppeteerCrawler } from './infrastructure/services/puppeteer.crawler';
import { JSDOMParser } from './infrastructure/services/jsdom.parser';
import { FileStorage } from './infrastructure/persistence/file.storage';
import { Logger } from './utils/logger';
import { KafkaBroker } from './infrastructure/services/kafka.broker';

async function bootstrap() {
    const logger = new Logger();

    try {
        // Инициализация конфигурации
        const config = new Config();
        const configuration = config.getConfig();

        const parser = new JSDOMParser();
        
        const storage = new FileStorage({
            sessionFile: configuration.sessionFile,
            outputDir: configuration.outputDir
        })
        
        const kafkaBroker = new KafkaBroker();
        await kafkaBroker.producerConnect();

        // Инициализация краулера
        const crawler = new PuppeteerCrawler(
            parser,
            storage,
            {
                originUrl: configuration.originUrl,
                targetUrl: configuration.targetUrl,
                maxDepth: configuration.maxDepth,
                requestDelay: configuration.requestDelay,
                browserArgs: configuration.browserArgs,
                viewport: configuration.viewport,
                headless: configuration.headless
            },
            logger,
            kafkaBroker
        );

        // Сохранение и использование сессии
        const session = await crawler.saveSession();
        await storage.saveSession(session);

        console.log('Launching headless browser and restoring session...');

        
        const loadedSession = await storage.loadSession();
        await crawler.useSession(loadedSession);

        await kafkaBroker.producerDisconnect();

    } catch (error) {
        logger.error('Application error:', error as Error);
        process.exit(1);
    }
}

// Запуск приложения
bootstrap().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
