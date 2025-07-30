import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useSocket } from './useSocket';

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
    const socket = useSocket(workspaceId);

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

    // Handle file system changes from backend
    useEffect(() => {
        if (!socket) return;

        const handleFileSystemChange = async (data: { event: string, path: string, workspaceId: string }) => {
            console.log('File system change detected:', data);
            
            if (data.event === 'add' || data.event === 'addDir') {
                try {
                    // Refresh file list when new files are created
                    const res = await axios.get(`${import.meta.env.VITE_HTTP_URL}/get-workspace-files`);
                    const workspaceFiles: WorkspaceFile[] = res.data;
                    
                    const fileList = doc.getArray<FileItem>('fileList');
                    const currentFiles = fileList.toArray();
                    
                    // Find new files that aren't in Y.js yet
                    const newFiles = workspaceFiles.filter(wf => 
                        !currentFiles.some(cf => cf.id === wf.id)
                    );
                    
                    if (newFiles.length > 0) {
                        doc.transact(() => {
                            // Add new file items
                            const newFileItems: FileItem[] = newFiles.map(file => ({
                                id: file.id,
                                name: file.name,
                                extension: file.extension,
                            }));
                            
                            fileList.push(newFileItems);
                            
                            // Add file content to Y.js
                            newFiles.forEach(file => {
                                const yText = doc.getText(file.id);
                                if (yText.length === 0) {
                                    yText.insert(0, file.content);
                                }
                            });
                        });
                        
                        console.log(`Added ${newFiles.length} new files to Y.js`);
                    }
                } catch (error) {
                    console.error('Error syncing new files to Y.js:', error);
                }
            }
        };

        socket.on('file-system-change', handleFileSystemChange);

        return () => {
            socket.off('file-system-change', handleFileSystemChange);
        };
    }, [socket, doc]);

    useEffect( () => {
        if (!isConnected || !provider || !socket) return;

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
    }, [isConnected, provider, doc, socket] )

    return {
        isConnected,
        provider,
        doc
    }
}