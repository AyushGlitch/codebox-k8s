import React, { useState } from 'react';
import * as Y from 'yjs';
import { getIconForFile, getIconForFolder, getIconForOpenFolder } from 'vscode-icons-js';
import { Button } from './ui/button';
import { type FileItem } from '../hooks/useYWorkspace';

interface FileManagerProps {
  ydoc: Y.Doc;
  activeFileId: string;
  onFileSelect: (fileId: string) => void;
}

interface FolderNode {
  name: string;
  type: 'file' | 'folder';
  children?: FolderNode[];
  fullPath?: string;
  isOpen?: boolean;
}

// Create folder structure from flat file list
const createFolderStructure = (files: FileItem[]): FolderNode[] => {
  const structure: FolderNode[] = [];
  const folderMap = new Map<string, FolderNode>();

  files.forEach(file => {
    const pathParts = file.name.split('/');
    let currentLevel = structure;
    let currentPath = '';

    pathParts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      
      if (index === pathParts.length - 1) {
        // It's a file
        currentLevel.push({
          name: part,
          type: 'file',
          fullPath: file.name
        });
      } else {
        // It's a folder
        let folder = currentLevel.find(node => node.name === part && node.type === 'folder') as FolderNode;
        
        if (!folder) {
          folder = {
            name: part,
            type: 'folder',
            children: [],
            isOpen: false
          };
          currentLevel.push(folder);
          folderMap.set(currentPath, folder);
        }
        
        currentLevel = folder.children!;
      }
    });
  });

  return structure;
};

export default function FileManager({ ydoc, activeFileId, onFileSelect }: FileManagerProps) {
  const [folderStructure, setFolderStructure] = useState<FolderNode[]>([]);

  React.useEffect(() => {
    const fileList = ydoc.getArray<FileItem>('fileList');
    
    const updateStructure = () => {
      const files = fileList.toArray();
      const structure = createFolderStructure(files);
      setFolderStructure(structure);
    };

    updateStructure();
    fileList.observe(updateStructure);

    return () => {
      fileList.unobserve(updateStructure);
    };
  }, [ydoc]);

  const toggleFolder = (folderName: string) => {
    const updateFolderState = (nodes: FolderNode[]): FolderNode[] => {
      return nodes.map(node => {
        if (node.type === 'folder' && node.name === folderName) {
          return { ...node, isOpen: !node.isOpen };
        }
        if (node.children) {
          return { ...node, children: updateFolderState(node.children) };
        }
        return node;
      });
    };

    setFolderStructure(updateFolderState(folderStructure));
  };

  const createNewFile = () => {
    const fileName = prompt('Enter file name:');
    if (!fileName) return;

    const fileList = ydoc.getArray<FileItem>('fileList');
    const newFile: FileItem = {
      id: fileName,
      name: fileName,
      extension: fileName.includes('.') ? fileName.split('.').pop() || '' : ''
    };

    fileList.push([newFile]);
    
    // Create empty content for the file
    const yText = ydoc.getText(fileName);
    if (yText.length === 0) {
      yText.insert(0, '');
    }

    onFileSelect(fileName);
  };

  const renderFolderNode = (node: FolderNode, depth: number = 0): React.ReactElement[] => {
    const elements: React.ReactElement[] = [];
    const paddingLeft = depth * 20;

    if (node.type === 'folder') {
      elements.push(
        <div
          key={node.name}
          className="flex items-center p-1 hover:bg-gray-700 cursor-pointer"
          style={{ paddingLeft }}
          onClick={() => toggleFolder(node.name)}
        >
          <img 
            src={node.isOpen ? getIconForOpenFolder(node.name) : getIconForFolder(node.name)} 
            alt="folder" 
            className="w-4 h-4 mr-2" 
          />
          <span className="text-sm">{node.name}</span>
        </div>
      );

      if (node.isOpen && node.children) {
        node.children.forEach(child => {
          elements.push(...renderFolderNode(child, depth + 1));
        });
      }
    } else {
      elements.push(
        <div
          key={node.fullPath}
          className={`flex items-center p-1 hover:bg-gray-700 cursor-pointer ${
            activeFileId === node.fullPath ? 'bg-blue-600' : ''
          }`}
          style={{ paddingLeft }}
          onClick={() => onFileSelect(node.fullPath!)}
        >
          <img 
            src={getIconForFile(node.name)} 
            alt="file" 
            className="w-4 h-4 mr-2" 
          />
          <span className="text-sm">{node.name}</span>
        </div>
      );
    }

    return elements;
  };

  return (
    <div className="w-64 bg-gray-800 text-white border-r border-gray-700 flex flex-col">
      <div className="p-3 border-b border-gray-700 flex items-center justify-between">
        <h2 className="font-semibold">Files</h2>
        <Button
          size="sm"
          variant="ghost"
          onClick={createNewFile}
          className="text-xs px-2 py-1"
        >
          + New
        </Button>
      </div>
      
      <div className="flex-1 overflow-auto">
        {folderStructure.map(node => renderFolderNode(node))}
      </div>
    </div>
  );
} 
