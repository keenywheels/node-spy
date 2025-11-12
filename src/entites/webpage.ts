/**
 * Interface for webpage serialization
 */
export interface WebpageData {
    url: string;
    depth: number;
    content: string;
    extractedText: string[];
}

/**
 * Represents a webpage with its content and metadata
 */
export class Webpage {
    constructor(
        public readonly url: string,
        public readonly depth: number,
        public readonly content: string,
        public readonly extractedText: string[],
    ) {}

    /**
     * Creates a Webpage instance from raw data
     */
    static create(data: {
        url: string;
        depth: number;
        content: string;
        extractedText: string[];
    }): Webpage {
        return new Webpage(
            data.url,
            data.depth,
            data.content,
            data.extractedText
        );
    }

    /**
     * Converts webpage to JSON
     */
    toJSON(): WebpageData {
        return {
            url: this.url,
            depth: this.depth,
            content: this.content,
            extractedText: this.extractedText
        };
    }
}