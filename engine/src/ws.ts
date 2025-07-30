import { Server as SocketIOServer, Socket } from "socket.io";
import { TerminalManager } from "./pty";
import { Server as HttpServer } from "http";
import { fetchDir, fetchFileContent, saveFile } from "./fs";
import { fetchMinioFolder, saveToMinio } from "./minio";
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

        chokidar.watch(`./workspace`).on('all', async (event: string, path: string) => {
            const rootContent = await fetchDir(workspaceId);
            socket.emit('loaded-files', rootContent);
        });

        socket.on('disconnect', () => {
            console.log('Socket.io client disconnected:', socket.id);
        });
    })
}

function initHandlers(socket: Socket, workspaceId: string) {
    socket.on('disconnet', () => {
        console.log('Socket.io client disconnected:', socket.id);
    })

    socket.on('fetchContent', async ({path}: {path: string}) => {
        const content = await fetchFileContent(path);
        socket.emit('file-content', content);
    })

    socket.on('saveFile', async ({path, content}: {path: string, content: string}) => {
        await saveFile(path, content);
        socket.emit('file-saved', path);
    })

    socket.on("updateContent", async ({ path: filePath, content }: { path: string, content: string }) => {
        const fullPath =  `./workspace/${filePath}`;
        await saveFile(fullPath, content);
        await saveToMinio(`codebox/${replId}`, filePath, content);
    });

    socket.on("requestTerminal", async () => {
        terminalManager.createPty(socket.id, replId, (data, id) => {
            socket.emit('terminal', {
                data: Buffer.from(data,"utf-8")
            });
        });
    });
    
    socket.on("terminalData", async ({ data }: { data: string, terminalId: number }) => {
        terminalManager.write(socket.id, data);
    });
}