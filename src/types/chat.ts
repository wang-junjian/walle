export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  attachments?: Attachment[];
  stats?: MessageStats;
  reasoning_content?: string; // 推理思维链内容
  reasoning_expanded?: boolean; // 控制思维链展开状态
  agent_thoughts?: AgentThought[]; // 智能体思考过程
  agent_expanded?: boolean; // 控制智能体思考展开状态
}

export interface AgentThought {
  id: string;
  type: 'observation' | 'thought' | 'action' | 'reflection' | 'tool_use' | 'collaboration' | 'decision' | 'memory_retrieval';
  title: string;
  content: string;
  timestamp: Date;
  status: 'running' | 'completed' | 'error' | 'waiting';
  
  // 工具使用相关
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_output?: Record<string, unknown>;
  
  // 反思相关
  reflection?: string;
  improvement?: string;
  
  // 协作相关
  collaborator?: string;
  context_shared?: Record<string, unknown>;
  sub_agents?: SubAgent[]; // 多智能体协作时的子智能体列表
  
  // 结构化思考
  reasoning_steps?: ReasoningStep[];
  alternatives?: Alternative[];
  
  // 决策相关
  decision?: {
    action: string;
    reasoning: string;
    confidence: number;
  };
  
  // 记忆相关
  memories_retrieved?: Array<{
    id: string;
    content: string;
    relevance: number;
  }>;
  
  // 执行时间和性能
  execution_time?: number;
  performance_metrics?: {
    cpu_time: number;
    memory_usage: number;
    tokens_used: number;
  };
}

export interface ReasoningStep {
  step: number;
  description: string;
  conclusion: string;
  confidence: number; // 0-1
}

export interface Alternative {
  option: string;
  pros: string[];
  cons: string[];
  feasibility: number; // 0-1
}

export interface SubAgent {
  id: string;
  name: string;
  role: string;
  expertise: string[];
  status: 'thinking' | 'working' | 'completed' | 'blocked';
  current_task?: string;
  progress: number; // 0-100
  deliverable?: string;
  tools_available?: string[];
}

export interface AgentMode {
  type: 'chat' | 'agent';
  label: string;
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
  type: 'content' | 'reasoning' | 'stats' | 'error' | 'agent_thought' | 'agent_thought_update' | 'agent_update' | 'tool_result' | 'sub_agent' | 'sub_agent_update';
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
  // 智能体相关字段
  agent_thought?: AgentThought;
  agent_thought_id?: string;
  agent_thought_update?: Partial<AgentThought>;
  status?: 'running' | 'completed' | 'error' | 'waiting';
  sub_agent?: SubAgent;
  sub_agent_id?: string;
  progress?: number;
  // 工具相关
  tool_call?: {
    name: string;
    input: Record<string, unknown>;
    output?: Record<string, unknown>;
  };
}
