import React, { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css'; // Ensure to import xterm CSS

const fitAddon = new FitAddon();

function ab2str(buf: ArrayBuffer): string {
    return String.fromCharCode.apply(null, new Uint8Array(buf) as unknown as number[]);
}

const OPTIONS_TERM = {
    useStyle: true,
    screenKeys: true,
    cursorBlink: true,
    cols: 5,
    theme: {
        background: 'black',
    },
};

interface TerminalCompProps {
    socket: Socket;
}

export const TerminalComp: React.FC<TerminalCompProps> = ({ socket }) => {
    const terminalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!terminalRef.current || !socket) {
            return;
        }

        const term = new Terminal(OPTIONS_TERM);
        term.loadAddon(fitAddon);
        term.open(terminalRef.current);
        fitAddon.fit();

        const terminalHandler = ({ data }: { data: ArrayBuffer | string }) => {
            if (data instanceof ArrayBuffer) {
                const strData = ab2str(data);
                term.write(strData);
            } else {
                term.write(data);
            }
        };

        socket.emit('requestTerminal');
        socket.on('terminal', terminalHandler);

        term.onData((data) => {
            socket.emit('terminalData', { data });
        });

        // Initial terminal command
        socket.emit('terminalData', { data: '\n' });

        // Cleanup function
        return () => {
            socket.off('terminal', terminalHandler);
            term.dispose();
        };
    }, [socket]);

    return (
        <div
            style={{ width: '99vw', height: '230px', textAlign: 'left' }}
            ref={terminalRef}
        ></div>
    );
};
