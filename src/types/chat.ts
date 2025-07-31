export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  attachments?: Attachment[];
  stats?: MessageStats;
}

export interface Attachment {
  type: 'image' | 'audio' | 'file';
  file: File;
  url?: string;
}

export interface ChatResponse {
  message: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface MessageStats {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  duration: string;
  tokensPerSecond: string;
  finishReason?: string;
}

export interface StreamChunk {
  type: 'content' | 'stats' | 'error';
  content?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  duration?: string;
  tokensPerSecond?: string;
  finishReason?: string;
  error?: string;
  details?: string;
}
