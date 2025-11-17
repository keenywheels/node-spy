import { Config } from './utils/config';
import { PuppeteerCrawler } from './core/puppeteer.crawler';
import { FileStorage } from './core/file.storage';
import { Logger } from './utils/logger';
import { KafkaBroker } from './core/kafka.broker';
import { JSDOMParser } from './core/jsdom.parser';

async function bootstrap() {
    console.log('Launching headless browser and restoring session...');

    const config = new Config('./config.json');
    const cfg = config.getConfig();
    if (process.argv.length > 3) {
        cfg.siteName = process.argv[2];
        cfg.originUrl = process.argv[3];
    }

    const logger = new Logger(/* {logLevel: 'debug'} */);

    const parser = new JSDOMParser();
    
    const storage = new FileStorage(cfg.sessionFile);
    const session = await storage.loadSession();
    
    const kafkaBroker = new KafkaBroker();
    await kafkaBroker.producerConnect();

    try {
        const crawler = new PuppeteerCrawler(
            {
                originUrl: cfg.originUrl,
                siteName: cfg.siteName,
                maxDepth: cfg.maxDepth,
                requestDelay: cfg.requestDelay,
                browserArgs: cfg.browserArgs
            },
            parser,
            kafkaBroker,
            logger
        );
        await crawler.init(session);
        
        await crawler.run();

        await kafkaBroker.producerDisconnect();

    } catch (error) {
        await kafkaBroker.producerDisconnect();

        logger.error('Application error:', error as Error);
        process.exit(1);
    }
}

// Запуск приложения
bootstrap().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
