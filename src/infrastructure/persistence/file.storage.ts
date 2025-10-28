import fs from 'fs/promises';
import path from 'path';
import { IStorage } from '../../core/interfaces/storage.interface';
import { Session } from '../../core/entities/session';
import { Webpage } from '../../core/entities/webpage';

/**
 * Реализация хранилища, использующего файловую систему
 */
export class FileStorage implements IStorage {
    constructor(private readonly config: {
        sessionFile: string;
        outputDir: string;
    }) {}

    /**
     * Сохраняет сессию в JSON файл
     */
    async saveSession(session: Session): Promise<void> {
        try {
            await fs.mkdir(path.dirname(this.config.sessionFile), { recursive: true });
            await fs.writeFile(
                this.config.sessionFile,
                JSON.stringify(session.toJSON(), null, 2),
                'utf8'
            );
        } catch (error) {
            throw new Error(`Failed to save session: ${error}`);
        }
    }

    /**
     * Загружает сессию из JSON файла
     */
    async loadSession(): Promise<Session> {
        try {
            const data = await fs.readFile(this.config.sessionFile, 'utf8');
            const jsonData = JSON.parse(data);
            return Session.create(jsonData);
        } catch (error) {
            throw new Error(`Failed to load session: ${error}`);
        }
    }

    /**
     * Сохраняет веб-страницу в файл
     */
    async saveWebpage(webpage: Webpage): Promise<void> {
        try {
            const filename = this.createFilename(webpage.url, webpage.depth);
            const filePath = path.join(this.config.outputDir, filename);
            
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            
            /* // Сохраняем HTML контент
            await fs.writeFile(
                `${filePath}.html`,
                webpage.content,
                'utf8'
            ); */
            
            // Сохраняем извлеченный текст
            await fs.writeFile(
                `${filePath}.txt`,
                webpage.extractedText.join('\n'),
                'utf8'
            );
        } catch (error) {
            throw new Error(`Failed to save webpage: ${error}`);
        }
    }

    /**
     * Загружает веб-страницу из файла
     */
    async loadWebpage(url: string): Promise<Webpage> {
        try {
            const filename = this.createFilename(url);
            const filePath = path.join(this.config.outputDir, filename);
            
            const [content, extractedText] = await Promise.all([
                fs.readFile(`${filePath}.html`, 'utf8'),
                fs.readFile(`${filePath}.txt`, 'utf8')
            ]);

            return new Webpage(
                url,
                0, // depth информация теряется при сохранении
                content,
                extractedText.split('\n')
            );
        } catch (error) {
            throw new Error(`Failed to load webpage: ${error}`);
        }
    }

    /**
     * Создает безопасное имя файла из URL
     */
    private createFilename(url: string, depth?: number): string {
        const urlSafe = url
            .replace(/[^a-z0-9]/gi, '_')
            .toLowerCase();
        
        return depth !== undefined 
            ? path.join(`depth_${depth}`, urlSafe)
            : urlSafe;
    }
}