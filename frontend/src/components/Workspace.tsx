import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useYWorkspace, type FileItem } from '../hooks/useYWorkspace';
import { useSocket } from '../hooks/useSocket';
import SharedMonaco from './SharedMonaco';
import FileManager from './FileManager';
import UserPresence from './UserPresence';
import { TerminalComp } from './Terminal';

export default function Workspace() {
  const { roomId } = useParams<{ roomId: string }>();
  const workspaceId = roomId || 'default';
  const { doc, provider, isConnected } = useYWorkspace(workspaceId);
  const socket = useSocket(workspaceId);
  const [activeFileId, setActiveFileId] = useState('index.ts');

  if (!isConnected) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Connecting to room: {roomId}</p>
        </div>
      </div>
    );
  }

  const activeFile = doc.getArray<FileItem>('fileList').toArray().find((f: FileItem) => f.id === activeFileId);

  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center justify-between p-2">
        <UserPresence provider={provider} />
      </div>
      
      <div className="flex-1 flex">
        <FileManager 
          ydoc={doc} 
          activeFileId={activeFileId} 
          onFileSelect={setActiveFileId} 
        />
        
        <div className="flex-1 flex flex-col">
          <div className="bg-gray-800 text-white p-2 border-b">
            <h3 className="font-medium">{activeFile?.name || activeFileId}</h3>
          </div>
          
          <div className="flex-1">
            <SharedMonaco
              ydoc={doc}
              fileId={activeFileId}
              provider={provider}
              language={activeFile?.extension?.replace('.', '')}
            />
          </div>

          {socket && <TerminalComp socket={socket} />}
        </div>
      </div>
    </div>
  );
} 