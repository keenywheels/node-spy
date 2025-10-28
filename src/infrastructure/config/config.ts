import path from 'path';
import fs from 'fs/promises';

/**
 * Интерфейс конфигурации для краулера
 */
interface CrawlerConfigType {
    // Файловая система
    sessionFile: string;
    outputDir: string;

    // URL и навигация
    originUrl: string;
    targetUrl: string;
    maxDepth: number;
    requestDelay: number;

    // Настройки браузера
    browserArgs: string[];
    viewport: {
        width: number;
        height: number;
    };
    headless: boolean;
}

/**
 * Базовая конфигурация
 */
const DEFAULT_CONFIG: CrawlerConfigType = {
    // Файловая система
    sessionFile: path.resolve('./data/session.json'),
    outputDir: path.resolve('./data/scraped'),

    // URL и навигация
    originUrl: 'https://www.wildberries.ru',
    targetUrl: 'https://www.wildberries.ru',
    maxDepth: 3,
    requestDelay: 3000,

    // Настройки браузера
    browserArgs: [
        '--no-sandbox',
        '--disable-blink-features=AutomationControlled',
/*         '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process', */
    ],
    viewport: { width: 1920, height: 1080 },
    headless: false
};

/**
 * Класс конфигурации с возможностью переопределения значений
 */
export class Config {
    private readonly config: CrawlerConfigType;
    
    constructor(customConfig: Partial<CrawlerConfigType> = {}) {
        this.config = {
            ...DEFAULT_CONFIG,
            ...customConfig
        };
        
        // Создаем необходимые директории
        this.createDirectories();
    }

    /**
     * Получить текущую конфигурацию
     */
    getConfig(): Readonly<CrawlerConfigType> {
        return Object.freeze({ ...this.config });
    }

    /**
     * Создание необходимых директорий
     */
    private async createDirectories(): Promise<void> {
        
        try {
            await fs.mkdir(path.dirname(this.config.sessionFile), { recursive: true });
            await fs.mkdir(this.config.outputDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create directories:', error);
        }
    }
}