import { Config } from './utils/config';
import { PuppeteerCrawler } from './core/puppeteer.crawler';
import { FileStorage } from './core/file.storage';
import { Logger } from './utils/logger';
import { KafkaBroker } from './core/kafka.broker';
import { JSDOMParser } from './core/jsdom.parser';

async function bootstrap() {
    const logger = new Logger();

    try {
        // Инициализация конфигурации
        const config = new Config();
        const cfg = config.getConfig();

        const parser = new JSDOMParser();
        
        const storage = new FileStorage(cfg.sessionFile)
        
        const kafkaBroker = new KafkaBroker();
        await kafkaBroker.producerConnect();

        // Инициализация краулера
        const crawler = new PuppeteerCrawler(
            parser,
            storage,
            logger,
            kafkaBroker,
            cfg,
            
        );

        console.log('Launching headful browser and saving session...');

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
