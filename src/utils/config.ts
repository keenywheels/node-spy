import path from 'path';
import fs from 'fs';

interface CrawlerConfigType {
    sessionFile: string;
    originUrl: string;
    siteName: string;
    maxDepth: number;
    requestDelay: number;
    minInitTime: number;
    browserArgs: string[];
}

const DEFAULT_CONFIG: CrawlerConfigType = {
    sessionFile: '../data/session.json',
    originUrl: 'https://www.wildberries.ru',
    siteName: 'wildberries',
    maxDepth: 5,
    requestDelay: 1000,
    minInitTime: 5000,
    browserArgs: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled',
        '--enable-unsafe-swiftshader',
        '--window-size=1920,1080'
    ],
};

export class Config {
    private readonly config: CrawlerConfigType;
    
    constructor(configPath: string = '../../config.json') {
        const configFile = fs.readFileSync(path.resolve(configPath), 'utf8');
        const configData = JSON.parse(configFile);
        
        this.config = {
            ...DEFAULT_CONFIG,
            ...configData
        };
        
        this.createDirectories();
    }

    getConfig(): CrawlerConfigType {
        return this.config;
    }

    private createDirectories() {
        try {
            fs.mkdir(path.dirname(this.config.sessionFile), { recursive: true }, (err) => {
                if (err) {
                  console.error('Error creating directory:', err);
                } else {
                  console.log('Directory created successfully!');
                }
            });
        } catch (error) {
            console.error('Failed to create directories:', error);
        }
    }
}