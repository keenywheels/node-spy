import { JSDOM, VirtualConsole } from 'jsdom';

/**
 * Represents DOM parser
 */
export class JSDOMParser {
    protected readonly wordRegex = /^[A-Za-zА-Яа-яЁё]+$/;
    private readonly virtualConsole: VirtualConsole;

    constructor() {
        this.virtualConsole = new VirtualConsole();
        this.virtualConsole.on('jsdomError', (err: any) => {
            if (err.type === 'css parsing') {
                return;
            }
            console.error(err);
        });
    }

    /**
     * Extracts text from DOM element recursively
     */
    protected getNodeText(element: Element): string {
        let text = '';

        for (const node of element.childNodes) {
            if (node.nodeType === node.TEXT_NODE) {
                text += node.textContent ?? '';
                text += ' ';
            } else {
                text += this.getNodeText(node as Element);
            }
        }

        return text;
    }

    /**
     * Extracts text content from HTML
     */
    parseHTML(html: string): string[] {
        try {
            //const cleanedHtml = this.cleanHTML(html);
            const dom = new JSDOM(html, { virtualConsole: this.virtualConsole });
            const pageText = this.getNodeText(dom.window.document.body);
            return this.cleanString(pageText);
        } catch (error) {
            console.error('Error parsing HTML:', error);
            throw Error('Failed to parse HTML');
        }
    }

    /**
     * Extracts links from HTML
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
     * Cleans and splits string into words
     */
    protected cleanString(str: string): string[] {
        str = str.replace(/\s+/g, ' ').trim();
        const words = str.split(' ').filter(word => {
            return word.length > 0 && this.wordRegex.test(word);
        });
        return words;
    }

    /**
     * Cleans HTML from scripts and styles
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