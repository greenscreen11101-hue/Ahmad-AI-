
export type Sender = 'user' | 'ai';

export interface Message {
  id: number;
  text: string;
  sender: Sender;
  attachments?: {
    name: string;
    type: string;
  }[];
  type?: 'message' | 'separator';
  rating?: 'up' | 'down';
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  lastModified: string;
  summary?: string;
}

export interface Skill {
  name: string;
  description: string;
  code: string;
  timestamp: string;
}

export interface TaughtSkill {
  id: string;
  name: string;
  commandExample: string;
  outcome: string;
  parameters: string[];
  timestamp: string;
}

export interface Memory {
  id: string;
  title: string;
  content: string;
  tags: string[];
  timestamp: string;
  importance: number; // 1-10 scale
}

export type Theme = 'light' | 'dark';

export type View = 'chat' | 'settings' | 'upgrades' | 'teach' | 'memory' | 'history';

export type AIProvider = 'gemini' | 'openrouter' | 'huggingface' | 'hybrid';

export interface AISettings {
  provider: AIProvider;
  openRouterApiKeys: string[];
  openRouterKeyIndex: number;
  huggingFaceApiKeys: string[];
  huggingFaceKeyIndex: number;
  isComplexTaskMode: boolean;
}

// Defines the shape for OpenRouter API requests, though we use Gemini directly.
// This is for demonstration of what a more complex system might use.
export interface OpenRouterRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
}

export interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export interface ExecutionPlan {
  skillName: string;
  code: string;
  args: any[];
}

export type OfflineCache = Record<string, string>;