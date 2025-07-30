import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronDown } from 'lucide-react';
import { getIconForFile, getIconForFolder, getIconForOpenFolder } from 'vscode-icons-js';
import * as Y from 'yjs';
import { FileItem } from '../hooks/useYRoom';

interface Props {
  ydoc: Y.Doc;
  activeFileId: string;
  onFileSelect: (fileId: string) => void;
}

interface FolderNode {
  name: string;
  path: string;
  isExpanded: boolean;
  children: FolderNode[];
  files: FileItem[];
}

export default function FileManager({ ydoc, activeFileId, onFileSelect }: Props) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set([''])); // Root is expanded by default

  useEffect(() => {
    const fileList = ydoc.getArray<FileItem>('files');
    
    const updateFiles = () => {
      setFiles(fileList.toArray());
    };

    updateFiles();
    fileList.observe(updateFiles);

    return () => {
      fileList.unobserve(updateFiles);
    };
  }, [ydoc]);

  const buildFolderTree = (files: FileItem[]): FolderNode => {
    const root: FolderNode = {
      name: '',
      path: '',
      isExpanded: true,
      children: [],
      files: []
    };

    const folderMap = new Map<string, FolderNode>();
    folderMap.set('', root);

    files.forEach(file => {
      const pathParts = file.name.split('/');
      const fileName = pathParts.pop()!;
      const folderPath = pathParts.join('/');

      // Create folder hierarchy
      let currentPath = '';
      let currentFolder = root;

      pathParts.forEach(folderName => {
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;

        if (!folderMap.has(currentPath)) {
          const newFolder: FolderNode = {
            name: folderName,
            path: currentPath,
            isExpanded: expandedFolders.has(currentPath),
            children: [],
            files: []
          };

          folderMap.set(currentPath, newFolder);
          currentFolder.children.push(newFolder);
        }

        currentFolder = folderMap.get(currentPath)!;
      });

      // Add file to its folder
      const fileWithPath: FileItem = {
        ...file,
        id: file.id,
        name: fileName
      };
      currentFolder.files.push(fileWithPath);
    });

    // Sort folders and files
    const sortNode = (node: FolderNode) => {
      node.children.sort((a, b) => a.name.localeCompare(b.name));
      node.files.sort((a, b) => a.name.localeCompare(b.name));
      node.children.forEach(sortNode);
    };

    sortNode(root);
    return root;
  };

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderPath)) {
        newSet.delete(folderPath);
      } else {
        newSet.add(folderPath);
      }
      return newSet;
    });
  };

  const deleteFile = (fileId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    const fileList = ydoc.getArray<FileItem>('files');
    const index = files.findIndex(f => f.id === fileId);
    
    if (index !== -1) {
      ydoc.transact(() => {
        fileList.delete(index, 1);
      });
      
      if (fileId === activeFileId && files.length > 1) {
        const remainingFiles = files.filter(f => f.id !== fileId);
        if (remainingFiles.length > 0) {
          onFileSelect(remainingFiles[0].id);
        }
      }
    }
  };

  const renderFolderNode = (node: FolderNode, depth: number = 0): JSX.Element[] => {
    const elements: JSX.Element[] = [];

    if (node.name) {
      const isExpanded = expandedFolders.has(node.path);
      const folderIcon = isExpanded ? getIconForOpenFolder(node.name) : getIconForFolder(node.name);
      
      elements.push(
        <div
          key={`folder-${node.path}`}
          onClick={() => toggleFolder(node.path)}
          className="flex items-center gap-2 p-1 hover:bg-gray-700 cursor-pointer rounded"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <img 
            src={`https://raw.githubusercontent.com/vscode-icons/vscode-icons/master/icons/${folderIcon}`}
            alt="folder"
            className="w-4 h-4"
          />
          <span className="text-sm">{node.name}</span>
        </div>
      );
    }

    if (expandedFolders.has(node.path)) {
      node.children.forEach(child => {
        elements.push(...renderFolderNode(child, depth + 1));
      });

      node.files.forEach(file => {
        const fileIcon = getIconForFile(file.name);
        
        elements.push(
          <div
            key={`file-${file.id}`}
            onClick={() => onFileSelect(file.id)}
            className={`flex items-center justify-between p-2 rounded cursor-pointer group ${
              activeFileId === file.id ? 'bg-blue-600' : 'hover:bg-gray-700'
            }`}
            style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}
          >
            <div className="flex items-center gap-2">
              <img 
                src={`https://raw.githubusercontent.com/vscode-icons/vscode-icons/master/icons/${fileIcon}`}
                alt="file"
                className="w-4 h-4"
              />
              <span className="text-sm">{file.name}</span>
            </div>
            {files.length > 1 && (
              <button
                onClick={(e) => deleteFile(file.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-600 rounded"
              >
                <X size={12} />
              </button>
            )}
          </div>
        );
      });
    }

    return elements;
  };

  const folderTree = buildFolderTree(files);

  return (
    <div className="w-64 bg-gray-900 text-white p-4 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Files</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {renderFolderNode(folderTree)}
      </div>
    </div>
  );
} 
