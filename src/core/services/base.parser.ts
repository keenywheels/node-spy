import { IParser } from '../interfaces/parser.interface';

/**
 * Абстрактный базовый класс парсера
 */
export abstract class BaseParser implements IParser {
    protected readonly wordRegex = /^[A-Za-zА-Яа-яЁё]+$/;

    /**
     * Очищает строку и разбивает на слова
     */
    protected cleanString(str: string): string[] {
        str = str.replace(/\s+/g, ' ').trim();
        const words = str.split(' ').filter(word => {
            return word.length > 0 && this.wordRegex.test(word);
        });
        return words;
    }

    /**
     * Рекурсивно извлекает текст из DOM-элемента
     */
    protected abstract getNodeText(element: Element): string;

    /**
     * Извлекает текстовое содержимое из HTML
     */
    abstract parseHTML(html: string): string[];

    /**
     * Извлекает ссылки из HTML
     */
    abstract extractLinks(html: string): string[];

    /**
     * Извлекает метаданные из HTML
     */
    abstract extractMetadata(html: string): Record<string, string>;

    /**
     * Очищает HTML от нежелательных элементов
     */
    protected abstract cleanHTML(html: string): string;
}

