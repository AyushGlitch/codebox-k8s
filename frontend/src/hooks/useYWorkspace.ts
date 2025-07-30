import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

export interface FileItem {
    id: string;
    name: string;
    extension: string;
}

export interface WorkspaceFile {
    id: string;
    name: string;
    extension: string;
    content: string;
}


export const useYWorkspace = (workspaceId: string) => {
    const [isConnected, setIsConnected] = useState(false);
    const [provider, setProvider] = useState<WebsocketProvider | null>(null);
    const doc = useMemo(() => new Y.Doc(), [workspaceId]);

    useEffect( () => {
        const wsProvider = new WebsocketProvider(import.meta.env.VITE_YJS_SERVER_URL, workspaceId, doc);

        wsProvider.on('status', (event: { status: string }) => {
            setIsConnected(event.status === 'connected');
        })

        wsProvider.awareness.setLocalStateField('user', {
            name: `User-${Math.random().toString(36).substring(2, 15)}`,
            color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
        })

        setProvider(wsProvider);

        return () => {
            wsProvider.destroy();
        };
    }, [doc, workspaceId] )


    useEffect( () => {
        if (!isConnected || !provider) return;

        const fileList = doc.getArray<FileItem>('fileList');
        
        const initTimeout = setTimeout( async () => {
            if (fileList.length === 0) {
                const initMarker = doc.getText('initMarker');

                if (initMarker.length === 0) {
                    try {
                        const res = await axios.get(`${import.meta.env.VITE_HTTP_URL}/get-workspace-files`);
                        const workspaceFiles: WorkspaceFile[] = res.data;

                        doc.transact( () => {
                            initMarker.insert(0, 'initialized');

                            const fileItems: FileItem[] = workspaceFiles.map( (file) => ({
                                id: file.id,
                                name: file.name,
                                extension: file.extension,
                            }) )

                            fileList.push(fileItems);

                            workspaceFiles.forEach( (file) => {
                                const yText = doc.getText(file.id);
                                if (yText.length === 0) {
                                    yText.insert(0, file.content);
                                }
                            } )
                        } )

                        console.log(`Workspace initialized with ${workspaceFiles.length} files`);
                    } catch (error) {
                        console.error('Error initializing workspace:', error);
                    }
                }
            }
        }, 1000 )

        return () => {
            clearTimeout(initTimeout);
        }
    }, [isConnected, provider, doc] )

    return {
        isConnected,
        provider,
        doc
    }
}