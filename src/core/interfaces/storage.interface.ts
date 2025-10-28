import { Session } from '../entities/session';
import { Webpage } from '../entities/webpage';

/**
 * Интерфейс для хранилища данных, определяющий методы для работы с сессиями и веб-страницами.
 */
export interface IStorage {
    /**
     * Сохраняет объект сессии в хранилище.
     * @param {Session} session Объект сессии для сохранения.
     * @returns {Promise<void>}
     */
    saveSession(session: Session): Promise<void>;

    /**
     * Загружает объект сессии из хранилища.
     * @returns {Promise<Session>} Объект сессии.
     */
    loadSession(): Promise<Session>;

    /**
     * Сохраняет объект веб-страницы в хранилище.
     * @param {Webpage} webpage Объект веб-страницы для сохранения.
     * @returns {Promise<void>}
     */
    saveWebpage(webpage: Webpage): Promise<void>;

    /**
     * Загружает объект веб-страницы из хранилища по URL.
     * @param {string} url URL веб-страницы.
     * @returns {Promise<Webpage>} Объект веб-страницы.
     */
    loadWebpage(url: string): Promise<Webpage>;
}