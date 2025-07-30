import { useEffect, useRef, useState } from 'react';
import { Editor } from '@monaco-editor/react';
import { MonacoBinding } from 'y-monaco';
import * as monaco from 'monaco-editor';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

interface Props {
  ydoc: Y.Doc;
  fileId: string;
  provider: WebsocketProvider | null;
  language?: string;
  onContentChange?: (content: string) => void;
}

export default function SharedMonaco({ 
  ydoc, 
  fileId, 
  provider, 
  language = 'typescript',
  onContentChange 
}: Props) {
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);

  const yText = ydoc.getText(fileId);

  useEffect(() => {
    if (!editor || !provider) return;

    const model = editor.getModel();
    if (!model) return;

    // Create Monaco binding
    const binding = new MonacoBinding(
      yText,
      model,
      new Set([editor]),
      provider.awareness
    );

    bindingRef.current = binding;

    // Listen for content changes
    const disposable = model.onDidChangeContent(() => {
      onContentChange?.(model.getValue());
    });

    return () => {
      binding.destroy();
      disposable.dispose();
      bindingRef.current = null;
    };
  }, [editor, yText, provider, onContentChange]);

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    setEditor(editor);
    
    // Set initial content from Yjs
    const model = editor.getModel();
    if (model && yText.length > 0) {
      model.setValue(yText.toString());
    }
  };

  return (
    <Editor
      height="100%"
      language={language}
      theme="vs-dark"
      onMount={handleEditorDidMount}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        wordWrap: 'on',
        automaticLayout: true,
      }}
    />
  );
} 