import path from 'path';
import fs from 'fs/promises';

/**
 * Интерфейс конфигурации для краулера
 */
interface CrawlerConfigType {
    // Файловая система
    sessionFile: string;

    // URL и навигация
    originUrl: string;
    targetUrl: string;
    maxDepth: number;
    requestDelay: number;

    // Настройки браузера
    browserArgs: string[];
}

/**
 * Базовая конфигурация
 */
const DEFAULT_CONFIG: CrawlerConfigType = {
    // Файловая система
    sessionFile: path.resolve('./data/session.json'),

    // URL и навигация
    originUrl: 'https://www.avito.ru',
    targetUrl: 'https://www.avito.ru',
    maxDepth: 5,
    requestDelay: 1000,

    // Настройки браузера
    browserArgs: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled',
        '--enable-unsafe-swiftshader',
        '--window-size=1920,1080'
    ],
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
        } catch (error) {
            console.error('Failed to create directories:', error);
        }
    }
}