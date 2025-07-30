import { Server as SocketIOServer, Socket } from "socket.io";
import { TerminalManager } from "./pty";
import { Server as HttpServer } from "http";
import { fetchDir, fetchFileContent, saveFile } from "./fs";
import chokidar from "chokidar";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const terminalManager = new TerminalManager();

export const initWS = (httpServer: HttpServer) => {
    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', async (socket) => {
        console.log('New Socket.io client connected:', socket.id);

        const workspaceId = socket.handshake.query.workspaceId as string;

        initHandlers(socket, workspaceId);

        // Watch for file changes in workspace directory
        const watcher = chokidar.watch(`./workspace`, {
            ignored: /(^|[\/\\])\../, // ignore dotfiles
            persistent: true
        });

        watcher.on('all', async (event: string, filePath: string) => {
            try {
                console.log(`File ${event}: ${filePath}`);
                const rootContent = await fetchDir(`./workspace`, "");
                socket.emit('loaded-files', rootContent);
                
                // Notify about file system changes for Y.js sync
                socket.emit('file-system-change', {
                    event,
                    path: filePath,
                    workspaceId
                });
            } catch (error) {
                console.error('Error watching files:', error);
            }
        });

        socket.on('disconnect', () => {
            console.log('Socket.io client disconnected:', socket.id);
            watcher.close();
        });
    })
}

function initHandlers(socket: Socket, workspaceId: string) {
    socket.on('disconnect', () => {
        console.log('Socket.io client disconnected:', socket.id);
    })

    socket.on('fetchContent', async ({path}: {path: string}) => {
        try {
            const content = await fetchFileContent(path);
            socket.emit('file-content', content);
        } catch (error) {
            console.error('Error fetching file content:', error);
            socket.emit('file-error', { path, error: 'Failed to fetch file content' });
        }
    })

    socket.on('saveFile', async ({path, content}: {path: string, content: string}) => {
        try {
            await saveFile(path, content);
            socket.emit('file-saved', path);
        } catch (error) {
            console.error('Error saving file:', error);
            socket.emit('file-error', { path, error: 'Failed to save file' });
        }
    })

    socket.on("updateContent", async ({ path: filePath, content }: { path: string, content: string }) => {
        try {
            const fullPath = `./workspace/${filePath}`;
            await saveFile(fullPath, content);
            console.log(`File updated: ${fullPath}`);
        } catch (error) {
            console.error('Error updating file:', error);
        }
    });

    socket.on("requestTerminal", async () => {
        try {
            terminalManager.createPty(socket.id, workspaceId, (data, id) => {
                socket.emit('terminal', {
                    data: Buffer.from(data, "utf-8")
                });
            });
            console.log(`Terminal created for socket: ${socket.id}`);
        } catch (error) {
            console.error('Error creating terminal:', error);
        }
    });
    
    socket.on("terminalData", async ({ data }: { data: string }) => {
        try {
            terminalManager.write(socket.id, data);
        } catch (error) {
            console.error('Error writing to terminal:', error);
        }
    });
}