import { spawn, IPty } from 'node-pty';

const SHELL = "bash";

export class TerminalManager {
    private sessions: { [id: string]: { terminal: IPty, workspaceId: string } } = {};

    constructor() {
        this.sessions = {};
    }
    
    createPty(id: string, workspaceId: string, onData: (data: string, id: number) => void): IPty {
        let term = spawn(SHELL, [], {
            cols: 100,
            name: 'xterm',
            cwd: `./workspace`
        });
    
        term.onData((data: string) => onData(data, term.pid));
        
        this.sessions[id] = {
            terminal: term,
            workspaceId
        };
        
        term.onExit(() => {
            delete this.sessions[id];
        });
        
        console.log(`Created terminal session ${id} for workspace ${workspaceId}`);
        return term;
    }

    write(terminalId: string, data: string): void {
        const session = this.sessions[terminalId];
        if (session) {
            session.terminal.write(data);
        } else {
            console.warn(`Terminal session ${terminalId} not found`);
        }
    }

    clear(terminalId: string): void {
        const session = this.sessions[terminalId];
        if (session) {
            session.terminal.kill();
            delete this.sessions[terminalId];
            console.log(`Cleared terminal session ${terminalId}`);
        }
    }
}