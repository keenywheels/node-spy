import { Logger } from '../../utils/logger';
import { ICrawler } from '../interfaces/crawler.interface';
import { IParser } from '../interfaces/parser.interface';
import { IStorage } from '../interfaces/storage.interface';
import { Session } from '../entities/session';
import { Webpage } from '../entities/webpage';

/**
 * Абстрактный базовый класс краулера, реализующий общую логику
 */
export abstract class BaseCrawler implements ICrawler {

    constructor(
        protected readonly parser: IParser,
        protected readonly storage: IStorage,
        protected readonly config: {
            originUrl: string;
            targetUrl: string;
            maxDepth: number;
            requestDelay: number;
        }
    ) {}

    /**
     * Абстрактный метод для сохранения сессии.
     * Должен быть реализован в конкретных классах.
     */
    abstract saveSession(): Promise<Session>;

    /**
     * Абстрактный метод для использования сохраненной сессии.
     * Должен быть реализован в конкретных классах.
     */
    abstract useSession(session: Session): Promise<void>;

    /**
     * Абстрактный метод для рекурсивного обхода страниц.
     * Должен быть реализован в конкретных классах.
     */
    abstract visitPage(url: string, depth: number): Promise<Webpage>;

    /**
     * Проверяет, не превышена ли максимальная глубина обхода
     */
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
}
