import { Cookie } from 'puppeteer';

/**
 * Represents localStorage/sessionStorage data
 */
interface StorageData {
    [key: string]: string;
}

/**
 * Interface for session serialization
 */
export interface SessionData {
    savedAt: string;
    cookies: Cookie[];
    localStorageData: StorageData;
    sessionStorageData: StorageData;
}

/**
 * Respresents browser session
 */
export class Session {
    constructor(
        public readonly savedAt: Date,
        public readonly cookies: Cookie[],
        public readonly localStorage: Map<string, string>,
        public readonly sessionStorage: Map<string, string>
    ) {}

    /**
     * Creates Session instance from JSON
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
     * Converts session to JSON
     */
    toJSON(): SessionData {
        return {
            savedAt: this.savedAt.toISOString(),
            cookies: this.cookies,
            localStorageData: Object.fromEntries(this.localStorage),
            sessionStorageData: Object.fromEntries(this.sessionStorage)
        };
    }
}