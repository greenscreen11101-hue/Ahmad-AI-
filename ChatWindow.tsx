
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { Message } from '../types';
import { MessageBubble } from './MessageBubble';
import { ContextMenu } from './ContextMenu';
import { RawResponseModal } from './RawResponseModal';

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
  searchQuery: string;
  streamingMessage: Message | null;
  onDeleteMessage: (messageId: number) => void;
  onRegenerateResponse: () => void;
  onRateMessage: (messageId: number, rating: 'up' | 'down') => void;
}

const AIAvatar: React.FC = () => (
    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
        <i className="fa-solid fa-brain text-white text-sm" aria-hidden="true"></i>
    </div>
);

const ThinkingBubble: React.FC = () => (
    <div className="flex items-start gap-3 animate-fade-in mt-2 w-full max-w-2xl" role="status">
        <AIAvatar />
        <div className="flex-1 space-y-3 p-4 rounded-2xl rounded-bl-none bg-white/80 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/50 shadow-sm dark:shadow-lg">
             <div className="flex items-center gap-2 mb-2">
                 <span className="relative flex h-3 w-3">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-500"></span>
                 </span>
                 <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Ahmad AI is thinking...</span>
             </div>
             <div className="space-y-2 opacity-60">
                <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded-full w-3/4 animate-pulse"></div>
                <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded-full w-1/2 animate-pulse"></div>
             </div>
        </div>
    </div>
);


const EmptyChat: React.FC = () => (
  <div role="status" className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-500">
    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-primary-500 to-cyan-400 flex items-center justify-center mb-4">
        <i className="fa-solid fa-brain text-white text-3xl" aria-hidden="true"></i>
    </div>
    <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">Start a New Conversation</h2>
    <p className="max-w-sm mt-2 text-sm text-gray-600 dark:text-gray-400">
        Your chat history is clear. Ask me anything, or upload a file to get started.
    </p>
  </div>
);

const NoResults: React.FC<{ query: string }> = ({ query }) => (
  <div role="status" className="flex flex-col items-center justify-center h-full text-center text-gray-500">
    <i className="fa-solid fa-search text-4xl text-gray-400 dark:text-gray-600 mb-4" aria-hidden="true"></i>
    <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">No Results Found</h2>
    <p className="max-w-sm mt-2 text-sm text-gray-600 dark:text-gray-400">
      No messages found containing "<span className="font-bold text-gray-900 dark:text-gray-300">{query}</span>".
    </p>
  </div>
);

const ChatSeparator: React.FC = () => (
  <div className="flex items-center justify-center my-4">
    <span className="text-xs font-semibold text-gray-500 dark:text-gray-500 bg-gray-200 dark:bg-gray-800 px-3 py-1 rounded-full">New Topic</span>
  </div>
);


export const ChatWindow: React.FC<ChatWindowProps> = ({ 
    messages, 
    isLoading, 
    searchQuery, 
    streamingMessage, 
    onDeleteMessage, 
    onRegenerateResponse,
    onRateMessage
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{
    message: Message;
    position: { x: number; y: number };
  } | null>(null);
  const [rawResponseToShow, setRawResponseToShow] = useState<Message | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent, message: Message) => {
    e.preventDefault();
    e.stopPropagation();
    const menuWidth = 224;
    const menuHeight = 180;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 10);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 10);
    setContextMenu({ message, position: { x, y } });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  useEffect(() => {
    const handleClick = () => closeContextMenu();
    window.addEventListener('click', handleClick);
    window.addEventListener('scroll', handleClick, true);
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('scroll', handleClick, true);
    };
  }, [closeContextMenu]);

  const handleCopy = (message: Message) => {
    window.navigator.clipboard.writeText(message.text);
    closeContextMenu();
  };

  const handleShowRawResponse = (message: Message) => {
    setRawResponseToShow(message);
    closeContextMenu();
  };

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) {
      return messages;
    }
    return messages.filter(msg => 
        msg.type !== 'separator' && msg.text.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [messages, searchQuery]);

  useEffect(() => {
    if (scrollRef.current) {
      (scrollRef.current as any).scrollTop = (scrollRef.current as any).scrollHeight;
    }
  }, [filteredMessages, isLoading, streamingMessage]);

  const isSearching = !!searchQuery.trim();

  const renderContent = () => {
    const messagesToRender = isSearching ? filteredMessages : messages;
    if (messagesToRender.length === 0 && !streamingMessage && !isSearching) {
        return isLoading ? <div className="space-y-4 px-4 sm:px-0"><ThinkingBubble /></div> : <EmptyChat />;
    }
    if (messagesToRender.length === 0 && isSearching) {
        return <NoResults query={searchQuery} />;
    }

    return (
      <div className="space-y-4">
        {messagesToRender.map((message) => 
          message.type === 'separator' ? (
            <ChatSeparator key={message.id} />
          ) : (
            <MessageBubble 
              key={message.id} 
              message={message} 
              searchQuery={searchQuery} 
              isLastMessage={!streamingMessage && message.id === messages[messages.length - 1]?.id}
              onContextMenu={(e) => handleContextMenu(e, message)}
              onRegenerateResponse={onRegenerateResponse}
              onRate={onRateMessage}
            />
          )
        )}
        {streamingMessage && !isSearching && (
            <MessageBubble 
              key={streamingMessage.id} 
              message={streamingMessage} 
              searchQuery="" 
              isLastMessage={false}
              isTyping={true}
              onContextMenu={(e) => handleContextMenu(e, streamingMessage)}
              onRegenerateResponse={onRegenerateResponse}
              onRate={onRateMessage}
            />
        )}
        {isLoading && !streamingMessage && !isSearching && <ThinkingBubble />}
      </div>
    );
  };

  return (
    <div ref={chatWindowRef} className="relative h-full">
      <div ref={scrollRef} className="absolute inset-0 overflow-y-auto p-4 sm:p-6 bg-gray-50 dark:bg-gray-900 transition-colors duration-200" role="log" aria-label="Chat history">
        {renderContent()}
      </div>
      {contextMenu && (
        <ContextMenu
          message={contextMenu.message}
          position={contextMenu.position}
          isLastMessage={contextMenu.message.id === messages[messages.length - 1]?.id}
          onClose={closeContextMenu}
          onCopy={handleCopy}
          onDelete={onDeleteMessage}
          onRegenerate={onRegenerateResponse}
          onShowRaw={handleShowRawResponse}
        />
      )}
      <RawResponseModal
        isOpen={!!rawResponseToShow}
        rawText={rawResponseToShow?.text || ''}
        onClose={() => setRawResponseToShow(null)}
      />
    </div>
  );
};
