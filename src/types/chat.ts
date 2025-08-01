export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  attachments?: Attachment[];
  stats?: MessageStats;
  reasoning_content?: string; // 推理思维链内容
  reasoning_expanded?: boolean; // 控制思维链展开状态
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
  type: 'content' | 'reasoning' | 'stats' | 'error';
  content?: string;
  reasoning_content?: string; // 推理思维链内容
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  duration?: string;
  tokensPerSecond?: string;
  finishReason?: string;
  error?: string;
  details?: string;
}
