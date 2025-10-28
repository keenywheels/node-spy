import { JSDOM, VirtualConsole } from 'jsdom';
import { BaseParser } from '../../core/services/base.parser';

export class JSDOMParser extends BaseParser {
    private readonly virtualConsole: VirtualConsole;

    constructor() {
        super();

        this.virtualConsole = new VirtualConsole();
        this.virtualConsole.on('jsdomError', (err: any) => {
            if (err.type === 'css parsing') {
                return;
            }
            console.error(err);
        });
    }

    /**
     * Рекурсивно извлекает текст из DOM-элемента
     */
    protected getNodeText(element: Element): string {
        /* let text = '';
        for (const node of element.childNodes) {
            if (node.nodeType === node.ELEMENT_NODE && (node as Element).tagName === 'DIV') {
                text += this.getNodeText(node as Element);
            } else {
                text += ' ' + node.textContent;
            }
        }
        return text; */
        let text = '';

        for (const node of element.childNodes) {
            if (node.nodeType === node.TEXT_NODE) {
                text += node.textContent ?? '';
                text += ' ';
            } else /* if (node.nodeType === node.ELEMENT_NODE) */ {
                text += this.getNodeText(node as Element);
            }
        }

        return text;
}

/**
 * Извлекает текстовое содержимое из HTML
 */
parseHTML(html: string): string[] {
    try {
        const cleanedHtml = this.cleanHTML(html);
        const dom = new JSDOM(cleanedHtml, { virtualConsole: this.virtualConsole });
        const pageText = this.getNodeText(dom.window.document.body);
        return this.cleanString(pageText);
    } catch (error) {
        console.error('Error parsing HTML:', error);
        throw Error('Failed to parse HTML');
    }
}

/**
 * Извлекает ссылки из HTML
 */
extractLinks(html: string): string[] {
    try {
        const dom = new JSDOM(html, { virtualConsole: this.virtualConsole });
        const links = Array.from(dom.window.document.querySelectorAll('a[href]'))
            .map(link => {
                try {
                    const href = link.getAttribute('href');
                    if (!href) return null;
                    return new URL(href, dom.window.location.href).toString();
                } catch {
                    return null;
                }
            })
            .filter((url): url is string =>
                url !== null &&
                url.startsWith('http')
            );

        return [...new Set(links)];
    } catch (error) {
        console.error('Error extracting links:', error);
        throw Error('Failed to extract links');
    }
}

/**
 * Извлекает метаданные из HTML
 */
extractMetadata(html: string): Record < string, string > {
    try {
        const dom = new JSDOM(html, { virtualConsole: this.virtualConsole });
        const metadata: Record<string, string> = { };

dom.window.document
    .querySelectorAll('meta[name], meta[property]')
    .forEach(meta => {
        const name = meta.getAttribute('name') || meta.getAttribute('property');
        const content = meta.getAttribute('content');
        if (name && content) {
            metadata[name] = content;
        }
    });

const title = dom.window.document.querySelector('title')?.textContent;
if (title) {
    metadata['title'] = title;
}

return metadata;
        } catch (error) {
    console.error('Error extracting metadata:', error);
    throw Error('Failed to extract metadata');
}
    }

    /**
     * Очищает HTML от скриптов и стилей
     */
    protected cleanHTML(html: string): string {
    try {
        const dom = new JSDOM(html, { virtualConsole: this.virtualConsole });

        dom.window.document
            .querySelectorAll('script, style')
            .forEach(element => element.remove());

        dom.window.document
            .querySelectorAll('*')
            .forEach(element => {
                const attrs = element.getAttributeNames();
                attrs
                    .filter(attr => attr.startsWith('on'))
                    .forEach(attr => element.removeAttribute(attr));
            });

        return dom.window.document.documentElement.outerHTML;
    } catch (error) {
        console.error('Error cleaning HTML:', error);
        throw Error('Failed to clean HTML');
    }
}
}