/**
 * Интерфейс для парсера, определяющий основные методы для обработки HTML-контента.
 */
export interface IParser {
    /**
     * Извлекает текстовое содержимое из HTML-контента.
     * @param {string} html HTML-контент для обработки.
     * @returns {string[]} Массив строк, представляющих текстовое содержимое.
     */
    parseHTML(html: string): string[];

    /**
     * Извлекает ссылки из HTML-контента.
     * @param {string} html HTML-контент для обработки.
     * @returns {string[]} Массив строк, представляющих URL-ссылки.
     */
    extractLinks(html: string): string[];

    /**
     * Извлекает метаданные из HTML-контента.
     * @param {string} html HTML-контент для обработки.
     * @returns {Record<string, string>} Объект с метаданными.
     */
    extractMetadata(html: string): Record<string, string>;
}