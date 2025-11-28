
import React, { useState } from 'react';
import type { Message } from '../types';
import { CodeBlock } from './CodeBlock';

interface MessageBubbleProps {
  message: Message;
  searchQuery: string;
  isLastMessage: boolean;
  isTyping?: boolean;
  onContextMenu: (event: React.MouseEvent) => void;
  onRegenerateResponse: () => void;
  onRate: (messageId: number, rating: 'up' | 'down') => void;
}

const UserAvatar: React.FC = () => (
    <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center font-bold text-gray-700 dark:text-white text-sm flex-shrink-0">
        <i className="fa-solid fa-user" aria-hidden="true"></i>
    </div>
);

const AIAvatar: React.FC = () => (
    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
        <i className="fa-solid fa-brain text-white text-sm" aria-hidden="true"></i>
    </div>
);

const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query.trim() || !text) {
        return text;
    }
    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const parts = text.split(regex);
    return (
        <>
            {parts.map((part, index) =>
                part.toLowerCase() === query.toLowerCase() ? (
                    <mark key={index} className="bg-yellow-300 dark:bg-yellow-500 text-black px-0.5 rounded-sm">
                        {part}
                    </mark>
                ) : (
                    part
                )
            )}
        </>
    );
};

const MarkdownText: React.FC<{ content: string; searchQuery: string }> = ({ content, searchQuery }) => {
    if (!content.trim()) {
        return null;
    }
    
    const getHtml = () => {
        const escapedQuery = searchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const highlightedMarkdown = !searchQuery.trim()
            ? content
            : content.replace(new RegExp(`(${escapedQuery})`, 'gi'), `<mark class="bg-yellow-300 dark:bg-yellow-500 text-black px-0.5 rounded-sm">$1</mark>`);
        
        return (window as any).marked 
            ? (window as any).marked.parse(highlightedMarkdown, { gfm: true, breaks: true }) 
            : highlightedMarkdown.replace(/\n/g, '<br />');
    };
    
    const html = getHtml();
    
    // Updated typography classes to support both light (default) and dark modes
    return (
        <div
            className="text-base leading-relaxed prose dark:prose-invert max-w-none break-words
            /* Global Text */
            prose-p:text-gray-800 dark:prose-p:text-gray-200 prose-p:mb-4 prose-p:leading-7
            /* Headings */
            prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-gray-100 
            prose-h1:text-2xl prose-h1:mt-8 prose-h1:mb-4 prose-h1:pb-2 prose-h1:border-b prose-h1:border-gray-200 dark:prose-h1:border-gray-700
            prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4
            prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
            /* Lists */
            prose-ul:list-disc prose-ul:pl-6 prose-ul:mb-4 prose-ul:mt-2
            prose-ol:list-decimal prose-ol:pl-6 prose-ol:mb-4 prose-ol:mt-2
            prose-li:my-1 prose-li:text-gray-700 dark:prose-li:text-gray-300
            /* Inline Code */
            prose-code:text-primary-600 dark:prose-code:text-primary-300 prose-code:bg-gray-100 dark:prose-code:bg-gray-800/80 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-code:font-mono prose-code:text-sm
            /* Tables */
            prose-table:w-full prose-table:my-6 prose-table:text-left
            prose-th:border-b prose-th:border-gray-300 dark:prose-th:border-gray-600 prose-th:bg-gray-50 dark:prose-th:bg-gray-800/50 prose-th:p-3 prose-th:text-gray-900 dark:prose-th:text-gray-200 prose-th:font-semibold
            prose-td:border-b prose-td:border-gray-200 dark:prose-td:border-gray-700 prose-td:p-3 prose-td:text-gray-700 dark:prose-td:text-gray-300
            /* Blockquotes */
            prose-blockquote:border-l-4 prose-blockquote:border-primary-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400 prose-blockquote:bg-gray-50 dark:prose-blockquote:bg-gray-800/30 prose-blockquote:py-2 prose-blockquote:pr-2 prose-blockquote:rounded-r prose-blockquote:my-4
            /* Links */
            prose-a:text-primary-600 dark:prose-a:text-primary-400 prose-a:font-medium prose-a:no-underline hover:prose-a:underline
            /* Images */
            prose-img:rounded-lg prose-img:shadow-md prose-img:my-6
            /* Horizontal Rule */
            prose-hr:border-gray-200 dark:prose-hr:border-gray-600 prose-hr:my-8
            "
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
};

const renderMessageContent = (text: string, searchQuery: string) => {
    const codeBlockRegex = /```([a-zA-Z0-9.+\-]*)\s*([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
        }
        parts.push({ type: 'code', language: match[1] || 'plaintext', content: match[2].trim() });
        lastIndex = codeBlockRegex.lastIndex;
    }

    if (lastIndex < text.length) {
        parts.push({ type: 'text', content: text.substring(lastIndex) });
    }

    if (parts.length === 0 && text) {
        parts.push({ type: 'text', content: text });
    }

    return parts.map((part, index) => {
        if (part.type === 'code') {
            return <CodeBlock key={index} language={part.language} code={part.content} />;
        }
        return <MarkdownText key={index} content={part.content} searchQuery={searchQuery} />;
    });
};


export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, searchQuery, isLastMessage, isTyping, onContextMenu, onRegenerateResponse, onRate }) => {
  const isUser = message.sender === 'user';
  const isAi = message.sender === 'ai';
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCopied) return;
    window.navigator.clipboard.writeText(message.text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handleRegenerate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRegenerateResponse();
  };
  
  const handleRate = (e: React.MouseEvent, rating: 'up' | 'down') => {
      e.stopPropagation();
      onRate(message.id, rating);
  };

  return (
    <div className={`group flex items-start gap-3 w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && <AIAvatar />}
      
      <div
        onContextMenu={onContextMenu}
        className={`relative flex flex-col cursor-pointer min-w-0
          ${isUser ? 'items-end max-w-[85%] md:max-w-[75%]' : 'items-start max-w-[90%] md:max-w-[85%] lg:max-w-4xl'}
        `}
      >
        <div className={`px-4 py-3 sm:px-5 sm:py-4 rounded-2xl overflow-hidden shadow-sm transition-colors ${
          isUser
            ? 'bg-primary-600 text-white rounded-br-none'
            : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none w-full border border-gray-200 dark:border-gray-600/30'
        }`}>
            {isUser ? (
              <p className="text-base leading-relaxed whitespace-pre-wrap break-words">{highlightText(message.text, searchQuery)}</p>
            ) : (
              <div className="space-y-2 w-full min-w-0 overflow-x-auto">
                  {renderMessageContent(message.text, searchQuery)}
                  {isTyping && (
                      <span className="inline-block w-2 h-5 bg-primary-400 rounded-sm animate-pulse align-middle ml-1"></span>
                  )}
              </div>
            )}
        </div>

        {isUser && message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 flex flex-col items-end gap-2 w-full">
                {message.attachments.map((file, index) => (
                    <div key={index} className="bg-gray-100 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 flex items-center gap-2 max-w-full truncate">
                        <i className="fa-solid fa-paperclip text-gray-500 dark:text-gray-400 flex-shrink-0" aria-hidden="true"></i>
                        <span className="truncate" title={file.name}>{file.name}</span>
                    </div>
                ))}
            </div>
        )}

        {isAi && (
          <div className={`flex items-center gap-1.5 mt-2 ml-1 transition-opacity duration-200 ${message.rating ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} aria-label="Message actions">
            <button
                onClick={(e) => handleRate(e, 'up')}
                title="Good response"
                className={`flex items-center justify-center w-7 h-7 rounded-full backdrop-blur-sm transition-colors ${
                    message.rating === 'up' 
                    ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-500/30' 
                    : 'bg-gray-200/70 dark:bg-gray-800/70 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-700/90 hover:text-green-600 dark:hover:text-green-400'
                }`}
            >
                <i className="fa-solid fa-thumbs-up text-xs"></i>
            </button>
            <button
                onClick={(e) => handleRate(e, 'down')}
                title="Bad response"
                className={`flex items-center justify-center w-7 h-7 rounded-full backdrop-blur-sm transition-colors ${
                    message.rating === 'down' 
                    ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/30' 
                    : 'bg-gray-200/70 dark:bg-gray-800/70 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-700/90 hover:text-red-600 dark:hover:text-red-400'
                }`}
            >
                <i className="fa-solid fa-thumbs-down text-xs"></i>
            </button>
            
            <div className="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>

            <button
              onClick={handleCopy}
              title={isCopied ? "Copied!" : "Copy message"}
              className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-200/70 dark:bg-gray-800/70 text-gray-500 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700/90 hover:text-gray-900 dark:hover:text-white backdrop-blur-sm"
            >
              <i className={`fa-solid ${isCopied ? 'fa-check text-green-500 dark:text-green-400' : 'fa-copy'}`}></i>
            </button>
            {isLastMessage && (
              <button
                onClick={handleRegenerate}
                title="Regenerate response"
                className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-200/70 dark:bg-gray-800/70 text-gray-500 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700/90 hover:text-gray-900 dark:hover:text-white backdrop-blur-sm"
              >
                <i className="fa-solid fa-arrows-rotate"></i>
              </button>
            )}
          </div>
        )}
      </div>
       {isUser && <UserAvatar />}
    </div>
  );
};
