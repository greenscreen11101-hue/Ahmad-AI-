
import React, { useState, useRef, useEffect } from 'react';

interface InputBarProps {
  onSend: (text: string, files: File[]) => void;
  isLoading: boolean;
  isOnline: boolean;
  files: File[];
  onFilesChange: (files: File[]) => void;
}

const FilePreview: React.FC<{ file: File; onRemove: () => void }> = ({ file, onRemove }) => (
    <div className="flex items-center justify-between bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 text-xs px-2 py-1 rounded-full border border-gray-300 dark:border-transparent">
        <span className="truncate max-w-xs" title={file.name}>{file.name}</span>
        <button onClick={onRemove} className="ml-2 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-white" aria-label={`Remove ${file.name}`}>
            <i className="fa-solid fa-times" aria-hidden="true"></i>
        </button>
    </div>
);

export const InputBar: React.FC<InputBarProps> = ({ 
  onSend, 
  isLoading,
  isOnline,
  files,
  onFilesChange
}) => {
  const [text, setText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      (textarea as any).style.height = 'auto';
      const scrollHeight = (textarea as any).scrollHeight;
      (textarea as any).style.height = `${Math.min(scrollHeight, 200)}px`;
    }
  }, [text]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target as HTMLInputElement;
      if (input.files) {
          onFilesChange([...files, ...Array.from(input.files)]);
          input.value = '';
      }
  };

  const handleRemoveFile = (indexToRemove: number) => {
    onFilesChange(files.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((text.trim() || files.length > 0) && !isLoading) {
      onSend(text, files);
      setText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const getPlaceholderText = () => {
    if (!isOnline) {
      return "You are offline. Type 'offline search: [keyword]' to search history. (Ctrl+Enter to send)";
    }
    if (files.length > 0) {
      return "Describe the file(s) or ask a question... (Ctrl+Enter to send)";
    }
    return "Ask Ahmad AI... (Enter for new line, Ctrl+Enter to send)";
  }

  return (
    <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 transition-colors duration-200">
      {files.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
              {files.map((file, index) => (
                  <FilePreview key={index} file={file} onRemove={() => handleRemoveFile(index)} />
              ))}
          </div>
      )}
      <form onSubmit={handleSubmit} className="flex items-start gap-3">
        <input
            type="file"
            multiple
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
        />
        <button
            type="button"
            onClick={() => (fileInputRef.current as any)?.click()}
            disabled={isLoading}
            className="w-10 h-10 flex-shrink-0 bg-gray-100 dark:bg-gray-700 text-primary-600 dark:text-primary-500 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:text-gray-400 dark:disabled:text-gray-400 disabled:cursor-not-allowed transition-colors border border-gray-300 dark:border-transparent"
            aria-label="Attach files"
        >
            <i className="fa-solid fa-paperclip" aria-hidden="true"></i>
        </button>
        <label htmlFor="chat-input" className="sr-only">Message input</label>
        <textarea
          id="chat-input"
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholderText()}
          className="flex-1 w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all resize-none overflow-y-auto min-h-[42px] placeholder-gray-500 dark:placeholder-gray-400"
          disabled={isLoading}
          rows={1}
        />
        <button
          type="submit"
          disabled={isLoading || (!text.trim() && files.length === 0)}
          className="w-10 h-10 flex-shrink-0 bg-primary-500 text-white rounded-full flex items-center justify-center hover:bg-primary-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors shadow-sm"
          aria-label="Send message"
        >
          {isLoading ? (
            <>
              <span className="sr-only">Sending...</span>
              <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin" aria-hidden="true"></div>
            </>
          ) : (
            <i className="fa-solid fa-paper-plane" aria-hidden="true"></i>
          )}
        </button>
      </form>
    </div>
  );
};
