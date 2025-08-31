import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { QuillDelta } from '../../types';
import { debounce } from '../../utils/dataUtils';

interface QuillEditorProps {
  initialContent?: QuillDelta;
  onContentChange?: (content: QuillDelta, markdown: string, plainText: string) => void;
  onSave?: () => void;
  placeholder?: string;
  readOnly?: boolean;
  theme?: 'light' | 'dark';
  autoSave?: boolean;
  autoSaveDelay?: number;
}

export const QuillEditor: React.FC<QuillEditorProps> = ({
  initialContent,
  onContentChange,
  onSave,
  placeholder = 'Start writing...',
  readOnly = false,
  theme = 'dark',
  autoSave = true,
  autoSaveDelay = 300,
}) => {
  const webViewRef = useRef<WebView>(null);
  const [isReady, setIsReady] = useState(false);
  const [currentContent, setCurrentContent] = useState<QuillDelta | null>(null);

  // Debounced content change handler
  const debouncedContentChange = useCallback(
    debounce((content: QuillDelta, markdown: string, plainText: string) => {
      onContentChange?.(content, markdown, plainText);
    }, autoSaveDelay),
    [onContentChange, autoSaveDelay]
  );

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      
      switch (message.type) {
        case 'ready':
          setIsReady(true);
          if (initialContent) {
            setContent(initialContent);
          }
          break;
          
        case 'contentChange':
          const { content, markdown, plainText } = message.data;
          setCurrentContent(content);
          
          if (autoSave) {
            debouncedContentChange(content, markdown, plainText);
          } else {
            onContentChange?.(content, markdown, plainText);
          }
          break;
          
        case 'save':
          onSave?.();
          break;
          
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  const setContent = (content: QuillDelta) => {
    if (webViewRef.current && isReady) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'setContent',
        data: content,
      }));
    }
  };

  const getContent = (): QuillDelta | null => {
    return currentContent;
  };

  const focus = () => {
    if (webViewRef.current && isReady) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'focus',
      }));
    }
  };

  const blur = () => {
    if (webViewRef.current && isReady) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'blur',
      }));
    }
  };

  useEffect(() => {
    if (initialContent && isReady) {
      setContent(initialContent);
    }
  }, [initialContent, isReady]);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet">
      <style>
        body {
          margin: 0;
          padding: 16px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background-color: ${theme === 'dark' ? '#1e293b' : '#ffffff'};
          color: ${theme === 'dark' ? '#e2e8f0' : '#1e293b'};
        }
        
        .ql-container {
          border: none !important;
          font-size: 16px;
          line-height: 1.6;
        }
        
        .ql-editor {
          padding: 0;
          color: ${theme === 'dark' ? '#e2e8f0' : '#1e293b'};
          background-color: transparent;
        }
        
        .ql-editor.ql-blank::before {
          color: ${theme === 'dark' ? '#94a3b8' : '#64748b'};
          font-style: normal;
        }
        
        .ql-toolbar {
          border: none !important;
          border-bottom: 1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'} !important;
          padding: 8px 0 16px 0;
          margin-bottom: 16px;
        }
        
        .ql-toolbar .ql-stroke {
          stroke: ${theme === 'dark' ? '#e2e8f0' : '#1e293b'};
        }
        
        .ql-toolbar .ql-fill {
          fill: ${theme === 'dark' ? '#e2e8f0' : '#1e293b'};
        }
        
        .ql-toolbar button:hover {
          background-color: ${theme === 'dark' ? '#334155' : '#f1f5f9'};
        }
        
        .ql-toolbar button.ql-active {
          background-color: ${theme === 'dark' ? '#14b8a6' : '#14b8a6'};
        }
        
        .ql-snow .ql-picker {
          color: ${theme === 'dark' ? '#e2e8f0' : '#1e293b'};
        }
        
        .ql-snow .ql-picker-options {
          background-color: ${theme === 'dark' ? '#1e293b' : '#ffffff'};
          border: 1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'};
        }
        
        .ql-snow .ql-picker-item:hover {
          background-color: ${theme === 'dark' ? '#334155' : '#f1f5f9'};
        }
        
        /* Custom styles for better mobile experience */
        .ql-editor h1, .ql-editor h2, .ql-editor h3 {
          margin-top: 1em;
          margin-bottom: 0.5em;
        }
        
        .ql-editor ul, .ql-editor ol {
          padding-left: 1.5em;
        }
        
        .ql-editor blockquote {
          border-left: 4px solid #14b8a6;
          padding-left: 16px;
          margin-left: 0;
          font-style: italic;
        }
        
        .ql-editor code {
          background-color: ${theme === 'dark' ? '#334155' : '#f1f5f9'};
          padding: 2px 4px;
          border-radius: 4px;
          font-family: 'Monaco', 'Consolas', monospace;
        }
        
        .ql-editor pre {
          background-color: ${theme === 'dark' ? '#334155' : '#f1f5f9'};
          padding: 16px;
          border-radius: 8px;
          overflow-x: auto;
        }
      </style>
    </head>
    <body>
      <div id="editor"></div>
      
      <script src="https://cdn.quilljs.com/1.3.6/quill.min.js"></script>
      <script>
        const toolbarOptions = [
          ['bold', 'italic', 'underline', 'strike'],
          ['blockquote', 'code-block'],
          [{ 'header': 1 }, { 'header': 2 }],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'list': 'check' }],
          [{ 'script': 'sub'}, { 'script': 'super' }],
          [{ 'indent': '-1'}, { 'indent': '+1' }],
          [{ 'direction': 'rtl' }],
          [{ 'size': ['small', false, 'large', 'huge'] }],
          [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
          [{ 'color': [] }, { 'background': [] }],
          [{ 'font': [] }],
          [{ 'align': [] }],
          ['clean']
        ];
        
        const quill = new Quill('#editor', {
          theme: 'snow',
          placeholder: '${placeholder}',
          readOnly: ${readOnly},
          modules: {
            toolbar: readOnly ? false : toolbarOptions
          }
        });
        
        // Convert Quill Delta to Markdown (simplified)
        function deltaToMarkdown(delta) {
          let markdown = '';
          
          for (const op of delta.ops) {
            if (typeof op.insert === 'string') {
              let text = op.insert;
              
              if (op.attributes) {
                if (op.attributes.bold) text = \`**\${text}**\`;
                if (op.attributes.italic) text = \`*\${text}*\`;
                if (op.attributes.underline) text = \`<u>\${text}</u>\`;
                if (op.attributes.strike) text = \`~~\${text}~~\`;
                if (op.attributes.code) text = \`\\\`\${text}\\\`\`;
                if (op.attributes['code-block']) text = \`\\\`\\\`\\\`\\n\${text}\\n\\\`\\\`\\\`\`;
                if (op.attributes.header) {
                  const level = op.attributes.header;
                  text = \`\${'#'.repeat(level)} \${text}\`;
                }
                if (op.attributes.list === 'bullet') text = \`- \${text}\`;
                if (op.attributes.list === 'ordered') text = \`1. \${text}\`;
                if (op.attributes.list === 'check') text = \`- [ ] \${text}\`;
                if (op.attributes.blockquote) text = \`> \${text}\`;
              }
              
              markdown += text;
            }
          }
          
          return markdown.trim();
        }
        
        // Send ready message
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'ready'
        }));
        
        // Listen for content changes
        quill.on('text-change', function(delta, oldDelta, source) {
          if (source === 'user') {
            const content = quill.getContents();
            const markdown = deltaToMarkdown(content);
            const plainText = quill.getText();
            
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'contentChange',
              data: {
                content,
                markdown,
                plainText
              }
            }));
          }
        });
        
        // Listen for keyboard shortcuts
        quill.keyboard.addBinding({
          key: 'S',
          ctrlKey: true
        }, function(range, context) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'save'
          }));
          return false;
        });
        
        // Listen for messages from React Native
        document.addEventListener('message', function(event) {
          const message = JSON.parse(event.data);
          
          switch (message.type) {
            case 'setContent':
              quill.setContents(message.data);
              break;
              
            case 'focus':
              quill.focus();
              break;
              
            case 'blur':
              quill.blur();
              break;
          }
        });
        
        // Handle window message for Android
        window.addEventListener('message', function(event) {
          const message = JSON.parse(event.data);
          
          switch (message.type) {
            case 'setContent':
              quill.setContents(message.data);
              break;
              
            case 'focus':
              quill.focus();
              break;
              
            case 'blur':
              quill.blur();
              break;
          }
        });
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        onMessage={handleMessage}
        style={styles.webView}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        scalesPageToFit={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        keyboardDisplayRequiresUserAction={false}
        hideKeyboardAccessoryView={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default QuillEditor;
