import { Cookie } from 'puppeteer';

/**
 * Интерфейс для данных хранилища (localStorage/sessionStorage)
 */
interface StorageData {
    [key: string]: string;
}

/**
 * Класс, представляющий сессию браузера
 */
export class Session {
    constructor(
        public readonly savedAt: Date,
        public readonly cookies: Cookie[],
        public readonly localStorage: Map<string, string>,
        public readonly sessionStorage: Map<string, string>
    ) {}

    /**
     * Создает экземпляр Session из JSON данных
     */
    static create(data: {
        savedAt: string;
        cookies: Cookie[];
        localStorageData: StorageData;
        sessionStorageData: StorageData;
    }): Session {
        return new Session(
            new Date(data.savedAt),
            data.cookies,
            new Map(Object.entries(data.localStorageData)),
            new Map(Object.entries(data.sessionStorageData))
        );
    }

    /**
     * Преобразует сессию в JSON для сохранения
     */
    toJSON(): {
        savedAt: string;
        cookies: Cookie[];
        localStorageData: StorageData;
        sessionStorageData: StorageData;
    } {
        return {
            savedAt: this.savedAt.toISOString(),
            cookies: this.cookies,
            localStorageData: Object.fromEntries(this.localStorage),
            sessionStorageData: Object.fromEntries(this.sessionStorage)
        };
    }

    /**
     * Проверяет, не устарела ли сессия
     */
    isExpired(maxAge: number = 3600000): boolean {
        const now = new Date();
        return now.getTime() - this.savedAt.getTime() > maxAge;
    }

    /**
     * Проверяет наличие необходимых cookies
     */
    hasRequiredCookies(requiredCookies: string[]): boolean {
        const cookieNames = new Set(this.cookies.map(c => c.name));
        return requiredCookies.every(name => cookieNames.has(name));
    }
}