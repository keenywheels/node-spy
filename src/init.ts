import { Config } from './utils/config';
import { PuppeteerSessionStealer } from './core/puppeteer.crawler';
import { FileStorage } from './core/file.storage';
import { Logger } from './utils/logger';
import process from 'process';

async function bootstrap() {
    console.log('Launching headful browser and saving session...');
    const config = new Config('./config.json');
    const cfg = config.getConfig();
    if (process.argv.length > 2) {
        cfg.originUrl = process.argv[2];
    }

    const logger = new Logger();
    
    const storage = new FileStorage(cfg.sessionFile)
    
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
}

bootstrap().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
