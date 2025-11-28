
import type { ChatSession, Message } from '../types';

const SESSION_STORAGE_KEY = 'ahmad_ai_chat_sessions';

/**
 * Generates a default title based on the first message
 */
const generateTitle = (messages: Message[]): string => {
  if (messages.length === 0) return 'New Conversation';
  const firstUserMsg = messages.find(m => m.sender === 'user');
  return firstUserMsg ? firstUserMsg.text.slice(0, 30) + (firstUserMsg.text.length > 30 ? '...' : '') : 'New Conversation';
};

export const getSessions = (): ChatSession[] => {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to load sessions:", error);
    return [];
  }
};

export const saveSession = (id: string, messages: Message[], title?: string) => {
  const sessions = getSessions();
  const existingIndex = sessions.findIndex(s => s.id === id);
  
  const now = new Date().toISOString();
  const sessionTitle = title || (existingIndex >= 0 ? sessions[existingIndex].title : generateTitle(messages));

  const newSession: ChatSession = {
    id,
    title: sessionTitle,
    messages,
    createdAt: existingIndex >= 0 ? sessions[existingIndex].createdAt : now,
    lastModified: now,
  };

  if (existingIndex >= 0) {
    sessions[existingIndex] = newSession;
  } else {
    sessions.push(newSession);
  }

  // Sort by last modified (newest first)
  sessions.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
  
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));
};

export const deleteSession = (id: string) => {
  const sessions = getSessions();
  const updated = sessions.filter(s => s.id !== id);
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updated));
};

export const getSessionById = (id: string): ChatSession | undefined => {
  const sessions = getSessions();
  return sessions.find(s => s.id === id);
};

export const createNewSessionId = (): string => {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
