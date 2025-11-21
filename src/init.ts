import { Config } from './utils/config';
import { PuppeteerSessionStealer } from './core/puppeteer.crawler';
import { FileStorage } from './core/file.storage';
import { Logger } from './utils/logger';
import process from 'process';

async function bootstrap() {
    const config = new Config('./config_app.json');
    const cfg = config.getConfig();
    if (process.argv.length > 3) {
        cfg.siteName = process.argv[2];
        cfg.originUrl = process.argv[3];
    }

    const logger = new Logger({ logLevel: cfg.logLevel });
    logger.info('Launching headful browser and saving session...');

    const storage = new FileStorage(cfg.sessionDir, cfg.siteName);
    
    const sessionStealer = new PuppeteerSessionStealer(
        {
            originUrl: cfg.originUrl,
            minInitTime: cfg.minInitTime,
            browserArgs: cfg.browserArgs
        },
        logger
    );
    await sessionStealer.init();

    const session = await sessionStealer.saveSession();
    await storage.saveSession(session);
    logger.info('Session successfully saved');
}

bootstrap().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
