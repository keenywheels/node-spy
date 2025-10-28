/**
 * Class representing a webpage with its content and metadata
 */
export class Webpage {
    constructor(
        public readonly url: string,
        public readonly depth: number,
        public readonly content: string,
        public readonly extractedText: string[],
        public readonly metadata: WebpageMetadata = {}
    ) {}

    /**
     * Creates a Webpage instance from raw data
     */
    static create(data: {
        url: string;
        depth: number;
        content: string;
        extractedText: string[];
        metadata?: WebpageMetadata;
    }): Webpage {
        return new Webpage(
            data.url,
            data.depth,
            data.content,
            data.extractedText,
            data.metadata
        );
    }

    /**
     * Converts webpage to JSON for storage
     */
    toJSON(): WebpageData {
        return {
            url: this.url,
            depth: this.depth,
            content: this.content,
            extractedText: this.extractedText,
            metadata: this.metadata
        };
    }

    /**
     * Gets the domain name from the URL
     */
    getDomain(): string {
        try {
            return new URL(this.url).hostname;
        } catch {
            return '';
        }
    }

    /**
     * Gets content length
     */
    getContentLength(): number {
        return this.content.length;
    }

    /**
     * Gets word count from extracted text
     */
    getWordCount(): number {
        return this.extractedText.reduce((count, text) => 
            count + text.split(/\s+/).length, 0);
    }

    /**
     * Checks if the page contains specific text
     */
    containsText(searchText: string): boolean {
        return this.extractedText.some(text => 
            text.toLowerCase().includes(searchText.toLowerCase()));
    }
}

/**
 * Interface for webpage metadata
 */
export interface WebpageMetadata {
    title?: string;
    description?: string;
    keywords?: string[];
    author?: string;
    publishedDate?: string;
    modifiedDate?: string;
    [key: string]: any;
}

/**
 * Interface for webpage serialization
 */
export interface WebpageData {
    url: string;
    depth: number;
    content: string;
    extractedText: string[];
    metadata: WebpageMetadata;
}