// 智能体记忆系统
export interface Memory {
  id: string;
  type: 'episodic' | 'semantic' | 'procedural' | 'working';
  content: string;
  keywords: string[];
  importance: number; // 0-1, 用于记忆优先级
  timestamp: Date;
  associatedTasks: string[];
  emotionalContext?: {
    sentiment: 'positive' | 'negative' | 'neutral';
    intensity: number; // 0-1
  };
  retrievalCount: number; // 被检索的次数
  lastAccessed: Date;
}

export interface MemoryQuery {
  keywords?: string[];
  timeRange?: {
    start: Date;
    end: Date;
  };
  memoryType?: Memory['type'];
  minImportance?: number;
  limit?: number;
}

export class AgentMemorySystem {
  private memories: Map<string, Memory> = new Map();
  private maxMemories: number;
  private decayFactor: number; // 记忆衰减因子

  constructor(maxMemories: number = 1000, decayFactor: number = 0.01) {
    this.maxMemories = maxMemories;
    this.decayFactor = decayFactor;
  }

  // 存储新记忆
  store(memory: Omit<Memory, 'id' | 'retrievalCount' | 'lastAccessed'>): string {
    const id = this.generateMemoryId();
    const fullMemory: Memory = {
      ...memory,
      id,
      retrievalCount: 0,
      lastAccessed: new Date()
    };

    this.memories.set(id, fullMemory);
    
    // 如果超过最大容量，清理旧记忆
    if (this.memories.size > this.maxMemories) {
      this.cleanup();
    }

    return id;
  }

  // 检索记忆
  retrieve(query: MemoryQuery): Memory[] {
    let results: Memory[] = Array.from(this.memories.values());

    // 应用过滤器
    if (query.keywords && query.keywords.length > 0) {
      results = results.filter(memory => 
        query.keywords!.some(keyword => 
          memory.keywords.includes(keyword) || 
          memory.content.toLowerCase().includes(keyword.toLowerCase())
        )
      );
    }

    if (query.timeRange) {
      results = results.filter(memory => 
        memory.timestamp >= query.timeRange!.start && 
        memory.timestamp <= query.timeRange!.end
      );
    }

    if (query.memoryType) {
      results = results.filter(memory => memory.type === query.memoryType);
    }

    if (query.minImportance !== undefined) {
      results = results.filter(memory => memory.importance >= query.minImportance!);
    }

    // 按相关性和重要性排序
    results.sort((a, b) => {
      const scoreA = this.calculateRelevanceScore(a, query);
      const scoreB = this.calculateRelevanceScore(b, query);
      return scoreB - scoreA;
    });

    // 更新访问统计
    results.forEach(memory => {
      memory.retrievalCount++;
      memory.lastAccessed = new Date();
    });

    // 应用限制
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  // 更新记忆重要性
  updateImportance(memoryId: string, importance: number): boolean {
    const memory = this.memories.get(memoryId);
    if (memory) {
      memory.importance = Math.max(0, Math.min(1, importance));
      return true;
    }
    return false;
  }

  // 添加关键词到记忆
  addKeywords(memoryId: string, keywords: string[]): boolean {
    const memory = this.memories.get(memoryId);
    if (memory) {
      memory.keywords = [...new Set([...memory.keywords, ...keywords])];
      return true;
    }
    return false;
  }

  // 获取相关记忆统计
  getStats(): {
    totalMemories: number;
    byType: Record<Memory['type'], number>;
    averageImportance: number;
    mostAccessedMemories: Memory[];
  } {
    const memories = Array.from(this.memories.values());
    
    const byType: Record<Memory['type'], number> = {
      episodic: 0,
      semantic: 0,
      procedural: 0,
      working: 0
    };

    memories.forEach(memory => {
      byType[memory.type]++;
    });

    const totalImportance = memories.reduce((sum, memory) => sum + memory.importance, 0);
    const averageImportance = memories.length > 0 ? totalImportance / memories.length : 0;

    const mostAccessed = memories
      .sort((a, b) => b.retrievalCount - a.retrievalCount)
      .slice(0, 5);

    return {
      totalMemories: memories.length,
      byType,
      averageImportance,
      mostAccessedMemories: mostAccessed
    };
  }

  // 清理低重要性和久未使用的记忆
  private cleanup(): void {
    const memories = Array.from(this.memories.values());
    const now = new Date();

    // 计算记忆衰减分数
    const memoriesWithScores = memories.map(memory => {
      const daysSinceAccess = (now.getTime() - memory.lastAccessed.getTime()) / (1000 * 60 * 60 * 24);
      const decayedImportance = memory.importance * Math.exp(-this.decayFactor * daysSinceAccess);
      const accessBonus = Math.log(memory.retrievalCount + 1) * 0.1;
      
      return {
        memory,
        score: decayedImportance + accessBonus
      };
    });

    // 按分数排序，保留高分记忆
    memoriesWithScores.sort((a, b) => b.score - a.score);
    
    const toKeep = memoriesWithScores.slice(0, Math.floor(this.maxMemories * 0.8));
    const toRemove = memoriesWithScores.slice(Math.floor(this.maxMemories * 0.8));

    // 移除低分记忆
    toRemove.forEach(({ memory }) => {
      this.memories.delete(memory.id);
    });

    console.log(`记忆清理完成: 保留 ${toKeep.length} 条，移除 ${toRemove.length} 条`);
  }

  // 计算相关性分数
  private calculateRelevanceScore(memory: Memory, query: MemoryQuery): number {
    let score = memory.importance; // 基础重要性分数

    // 关键词匹配加分
    if (query.keywords) {
      const keywordMatches = query.keywords.filter(keyword =>
        memory.keywords.includes(keyword) ||
        memory.content.toLowerCase().includes(keyword.toLowerCase())
      ).length;
      score += keywordMatches * 0.3;
    }

    // 访问频率加分
    score += Math.log(memory.retrievalCount + 1) * 0.1;

    // 时间新鲜度加分
    const daysSinceCreation = (new Date().getTime() - memory.timestamp.getTime()) / (1000 * 60 * 60 * 24);
    score += Math.exp(-daysSinceCreation * 0.01) * 0.2;

    return score;
  }

  // 生成记忆ID
  private generateMemoryId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 导出记忆数据
  export(): Memory[] {
    return Array.from(this.memories.values());
  }

  // 导入记忆数据
  import(memories: Memory[]): void {
    this.memories.clear();
    memories.forEach(memory => {
      this.memories.set(memory.id, memory);
    });
  }

  // 根据内容智能提取关键词
  extractKeywords(content: string): string[] {
    // 简单的关键词提取逻辑
    const words = content
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fff]/g, '') // 保留中英文字符
      .split(/\s+/)
      .filter(word => word.length > 1);

    // 移除常见停用词
    const stopWords = new Set(['的', '是', '在', '了', '和', '与', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    
    const keywords = words.filter(word => !stopWords.has(word));
    
    // 统计词频，返回频率较高的词作为关键词
    const wordCount = new Map<string, number>();
    keywords.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });

    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }
}

// 工具函数：从对话中创建记忆
export function createMemoryFromConversation(
  userMessage: string,
  assistantResponse: string,
  importance: number = 0.5
): Omit<Memory, 'id' | 'retrievalCount' | 'lastAccessed'> {
  const content = `用户: ${userMessage}\n助手: ${assistantResponse}`;
  const memorySystem = new AgentMemorySystem();
  const keywords = memorySystem.extractKeywords(content);

  return {
    type: 'episodic',
    content,
    keywords,
    importance,
    timestamp: new Date(),
    associatedTasks: [],
    emotionalContext: {
      sentiment: 'neutral',
      intensity: 0.5
    }
  };
}

// 工具函数：从智能体思考中创建记忆
export function createMemoryFromThought(
  thought: { type: string; content: string; title: string },
  importance: number = 0.7
): Omit<Memory, 'id' | 'retrievalCount' | 'lastAccessed'> {
  const memorySystem = new AgentMemorySystem();
  const keywords = memorySystem.extractKeywords(`${thought.title} ${thought.content}`);

  return {
    type: 'semantic',
    content: `${thought.title}: ${thought.content}`,
    keywords,
    importance,
    timestamp: new Date(),
    associatedTasks: [thought.type]
  };
}
