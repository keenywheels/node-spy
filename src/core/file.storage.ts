import fs from 'fs/promises';
import path from 'path';
import { Session } from '../entites/session';

/**
 * Represents file storage for session
 */
export class FileStorage {
    constructor(private readonly sessionFile: string) {}

    /**
     * Saves session to JSON file
     */
    async saveSession(session: Session): Promise<void> {
        try {
            await fs.mkdir(path.dirname(this.sessionFile), { recursive: true });
            await fs.writeFile(
                this.sessionFile,
                JSON.stringify(session.toJSON(), null, 2),
                'utf8'
            );
        } catch (error) {
            throw new Error(`Failed to save session: ${error}`);
        }
    }

    /**
     * Loads session from JSON file
     */
    async loadSession(): Promise<Session> {
        try {
            const data = await fs.readFile(this.sessionFile, 'utf8');
            const jsonData = JSON.parse(data);
            return Session.create(jsonData);
        } catch (error) {
            throw new Error(`Failed to load session: ${error}`);
        }
    }
}