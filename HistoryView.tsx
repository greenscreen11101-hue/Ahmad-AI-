
import React, { useEffect, useState } from 'react';
import { getSessions, deleteSession } from '../services/sessionService';
import type { ChatSession } from '../types';

interface HistoryViewProps {
  onSelectSession: (session: ChatSession) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onSelectSession }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  useEffect(() => {
    setSessions(getSessions());
  }, []);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteSession(id);
    setSessions(getSessions());
  };

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-900 flex-1 overflow-y-auto transition-colors">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
        <i className="fa-solid fa-clock-rotate-left text-purple-600 dark:text-purple-500"></i>
        Chat History
      </h2>

      {sessions.length === 0 ? (
        <div className="text-center py-12 px-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <i className="fa-solid fa-comments text-5xl text-gray-300 dark:text-gray-600 mb-4"></i>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white">No Saved Chats</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Your conversations will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sessions.map(session => (
            <div 
                key={session.id} 
                onClick={() => onSelectSession(session)}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500/50 transition-colors cursor-pointer group shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {session.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(session.lastModified).toLocaleString()}
                    </p>
                </div>
                <button 
                  onClick={(e) => handleDelete(e, session.id)}
                  className="text-gray-400 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 p-2 transition-colors"
                  title="Delete Chat"
                >
                  <i className="fa-solid fa-trash"></i>
                </button>
              </div>
              <p className="text-gray-600 dark:text-gray-500 text-sm mt-3 truncate">
                {session.messages[session.messages.length - 1]?.text || "Empty session"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
