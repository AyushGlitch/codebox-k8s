import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useYRoom, FileItem } from '../hooks/useYRoom';
import SharedMonaco from './SharedMonaco';
import FileManager from './FileManager';
import UserPresence from './UserPresence';
import { deduplicateFiles } from '../utils/deduplicate';

export default function Workspace() {
  const { roomId } = useParams<{ roomId: string }>();
  const { doc, provider, isConnected } = useYRoom(roomId || 'default');
  const [activeFileId, setActiveFileId] = useState('index.ts');

  const handleCleanupDuplicates = () => {
    deduplicateFiles(doc);
  };

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

  const activeFile = doc.getArray<FileItem>('files').toArray().find((f: FileItem) => f.id === activeFileId);

  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center justify-between">
        <UserPresence provider={provider} />
        <button
          onClick={handleCleanupDuplicates}
          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 mr-2"
          title="Remove duplicate files"
        >
          Clean Duplicates
        </button>
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
              language={activeFile?.language}
            />
          </div>

          <TerminalComp socket={socket} />
        </div>
      </div>
    </div>
  );
} 