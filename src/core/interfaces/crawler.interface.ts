import { Session } from '../entities/session';
import { Webpage } from '../entities/webpage';

export interface ICrawler {
    saveSession(): Promise<Session>;
    useSession(session: Session): Promise<void>;
    visitPage(url: string, depth: number): Promise<Webpage>;
}