// @ts-nocheck
import { fork, IPty } from 'node-pty';

const SHELL = "bash";

export class TerminalManager {
    private sessions: { [id: string]: {terminal: IPty, workspaceId: string;} } = {};

    constructor() {
        this.sessions = {};
    }
    
    createPty(id: string, workspaceId: string, onData: (data: string, id: number) => void) {
        let term = fork(SHELL, [], {
            cols: 100,
            name: 'xterm',
            cwd: `./workspace`
        });
    
        term.on('data', (data: string) => onData(data, term.pid));
        this.sessions[id] = {
            terminal: term,
            workspaceId
        };
        term.on('exit', () => {
            delete this.sessions[term.pid];
        });
        return term;
    }

    write(terminalId: string, data: string) {
        this.sessions[terminalId]?.terminal.write(data);
    }

    clear(terminalId: string) {
        this.sessions[terminalId].terminal.kill();
        delete this.sessions[terminalId];
    }
}