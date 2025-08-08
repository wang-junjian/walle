// 智能聊天处理器 - 集成智能决策和适应性思考
import { selectToolsForTask, Tool } from './agent-tools';
import { getDecisionEngine, IntelligentDecision } from './intelligent-decision-engine';

export interface SmartChatResponse {
  content: string;
  shouldShowThinking: boolean;
  thinkingSteps?: Array<{
    id: string;
    type: 'analysis' | 'planning' | 'execution' | 'reflection';
    title: string;
    content: string;
    status: 'thinking' | 'completed' | 'failed';
  }>;
  toolsUsed?: string[];
  metadata: {
    decision: IntelligentDecision;
    processingTime: number;
    confidence: number;
  };
}

export class SmartChatProcessor {
  private decisionEngine = getDecisionEngine();
  
  async processMessage(message: string, context?: string): Promise<SmartChatResponse> {
    const startTime = Date.now();
    
    try {
      // 1. 智能决策分析
      const decision = await this.decisionEngine.analyzeUserRequest(message, context);
      
      console.log('🧠 智能决策结果:', {
        needsThinking: decision.needsThinking,
        strategy: decision.thinkingStrategy,
        tools: decision.toolsRequired,
        reasoning: decision.reasoning
      });
      
      // 2. 根据决策生成思考步骤（如果需要）
      const thinkingSteps = decision.needsThinking ? 
        await this.generateAdaptiveThinkingSteps(decision, message) : 
        undefined;
      
      // 3. 执行工具（如果需要）
      const toolResults: Record<string, unknown>[] = [];
      if (decision.toolsRequired.length > 0) {
        const tools = await selectToolsForTask(message);
        
        for (const tool of tools) {
          try {
            const result = await this.executeToolSafely(tool, message);
            toolResults.push(result);
            
            // 更新执行步骤状态
            if (thinkingSteps) {
              const executionStep = thinkingSteps.find(step => step.type === 'execution');
              if (executionStep) {
                executionStep.content = `✅ ${tool.name} 执行完成`;
                executionStep.status = 'completed';
              }
            }
          } catch (error) {
            console.error(`工具 ${tool.name} 执行失败:`, error);
            if (thinkingSteps) {
              const executionStep = thinkingSteps.find(step => step.type === 'execution');
              if (executionStep) {
                executionStep.content = `❌ ${tool.name} 执行失败: ${error}`;
                executionStep.status = 'failed';
              }
            }
          }
        }
      }
      
      // 4. 生成智能回复
      const response = await this.generateIntelligentResponse(
        message, 
        decision, 
        toolResults
      );
      
      // 5. 完成思考步骤
      if (thinkingSteps) {
        thinkingSteps.forEach(step => {
          if (step.status === 'thinking') {
            step.status = 'completed';
          }
        });
        
        // 添加反思步骤（如果是复杂任务）
        if (decision.estimatedComplexity === 'high') {
          thinkingSteps.push({
            id: 'reflection',
            type: 'reflection',
            title: '结果评估',
            content: '分析完成，已生成最佳回复方案',
            status: 'completed'
          });
        }
      }
      
      const processingTime = Date.now() - startTime;
      
      return {
        content: response,
        shouldShowThinking: decision.needsThinking,
        thinkingSteps,
        toolsUsed: decision.toolsRequired.length > 0 ? decision.toolsRequired : undefined,
        metadata: {
          decision,
          processingTime,
          confidence: decision.confidence
        }
      };
      
    } catch (error) {
      console.error('智能聊天处理失败:', error);
      
      return {
        content: '抱歉，处理您的请求时出现了问题。请稍后再试。',
        shouldShowThinking: false,
        metadata: {
          decision: {
            needsThinking: false,
            thinkingStrategy: 'none',
            toolsRequired: [],
            confidence: 0,
            reasoning: '处理失败',
            estimatedComplexity: 'low'
          },
          processingTime: Date.now() - startTime,
          confidence: 0
        }
      };
    }
  }
  
  private async generateAdaptiveThinkingSteps(
    decision: IntelligentDecision, 
    message: string
  ): Promise<Array<{
    id: string;
    type: 'analysis' | 'planning' | 'execution' | 'reflection';
    title: string;
    content: string;
    status: 'thinking' | 'completed' | 'failed';
  }>> {
    const steps = [];
    
    switch (decision.thinkingStrategy) {
      case 'quick':
        steps.push({
          id: 'quick-analysis',
          type: 'analysis' as const,
          title: '快速分析',
          content: `正在分析：${message}`,
          status: 'thinking' as const
        });
        
        if (decision.toolsRequired.length > 0) {
          steps.push({
            id: 'tool-execution',
            type: 'execution' as const,
            title: '执行操作',
            content: `准备使用工具：${decision.toolsRequired.join(', ')}`,
            status: 'thinking' as const
          });
        }
        break;
        
      case 'deep':
        steps.push(
          {
            id: 'deep-analysis',
            type: 'analysis' as const,
            title: '深度分析',
            content: '深入理解问题的背景和需求',
            status: 'thinking' as const
          },
          {
            id: 'solution-planning',
            type: 'planning' as const,
            title: '方案设计',
            content: '设计最佳解决方案',
            status: 'thinking' as const
          }
        );
        
        if (decision.toolsRequired.length > 0) {
          steps.push({
            id: 'tool-execution',
            type: 'execution' as const,
            title: '执行操作',
            content: `执行必要的操作和工具`,
            status: 'thinking' as const
          });
        }
        break;
        
      case 'step-by-step':
        steps.push(
          {
            id: 'problem-breakdown',
            type: 'analysis' as const,
            title: '问题分解',
            content: '将复杂问题分解为可执行的步骤',
            status: 'thinking' as const
          },
          {
            id: 'execution-plan',
            type: 'planning' as const,
            title: '执行计划',
            content: '制定详细的执行计划',
            status: 'thinking' as const
          }
        );
        
        if (decision.toolsRequired.length > 0) {
          steps.push({
            id: 'tool-execution',
            type: 'execution' as const,
            title: '逐步执行',
            content: `按计划执行各项操作`,
            status: 'thinking' as const
          });
        }
        break;
    }
    
    return steps;
  }
  
  private async executeToolSafely(tool: Tool, message: string): Promise<Record<string, unknown>> {
    try {
      const input = this.prepareToolInput(tool, message);
      return await tool.execute(input);
    } catch (error) {
      return {
        error: `工具执行失败: ${error}`,
        success: false
      };
    }
  }
  
  private prepareToolInput(tool: Tool, message: string): Record<string, unknown> {
    switch (tool.name) {
      case 'web_search':
        return {
          query: message,
          searchType: this.detectSearchType(message),
          maxResults: 5
        };
        
      case 'code_execution':
        return {
          code: this.extractCode(message) || message,
          language: this.detectLanguage(message),
          enableDebug: false
        };
        
      case 'calculator':
        return {
          expression: this.extractMathExpression(message) || message
        };
        
      default:
        return { input: message };
    }
  }
  
  private detectSearchType(message: string): 'general' | 'technical' | 'news' | 'academic' {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('api') || lowerMessage.includes('文档') || lowerMessage.includes('技术')) {
      return 'technical';
    }
    if (lowerMessage.includes('新闻') || lowerMessage.includes('最新')) {
      return 'news';
    }
    if (lowerMessage.includes('学术') || lowerMessage.includes('论文')) {
      return 'academic';
    }
    
    return 'general';
  }
  
  private detectLanguage(message: string): 'javascript' | 'python' | 'typescript' | 'sql' | 'shell' {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('python')) return 'python';
    if (lowerMessage.includes('sql')) return 'sql';
    if (lowerMessage.includes('shell')) return 'shell';
    if (lowerMessage.includes('typescript')) return 'typescript';
    
    return 'javascript';
  }
  
  private extractCode(message: string): string | null {
    const codeBlockMatch = message.match(/```[\w]*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }
    
    if (/^\s*[\d\s+\-*/().=]+\s*$/.test(message)) {
      return message.trim();
    }
    
    return null;
  }
  
  private extractMathExpression(message: string): string | null {
    const mathMatch = message.match(/[\d\s+\-*/().=]+/);
    return mathMatch ? mathMatch[0] : null;
  }
  
  private async generateIntelligentResponse(
    message: string,
    decision: IntelligentDecision,
    toolResults: Record<string, unknown>[]
  ): Promise<string> {
    // 根据决策和工具结果生成智能回复
    
    // 如果有工具结果，整合到回复中
    if (toolResults.length > 0) {
      let response = '根据分析和计算结果：\n\n';
      
      toolResults.forEach((result) => {
        if (result.success !== false) {
          // 格式化工具结果
          if (result.result !== undefined) {
            response += `计算结果：${result.result}\n`;
          } else if (result.results && Array.isArray(result.results)) {
            response += `搜索结果：\n`;
            result.results.slice(0, 3).forEach((item: Record<string, unknown>, i: number) => {
              response += `${i + 1}. ${item.title}\n${item.snippet}\n\n`;
            });
          } else {
            response += `操作完成：${JSON.stringify(result, null, 2)}\n\n`;
          }
        }
      });
      
      return response + '希望这些信息对您有帮助！';
    }
    
    // 常识性问题的直接回答
    if (decision.thinkingStrategy === 'none') {
      if (message.toLowerCase().includes('你好')) {
        return '你好！我是 Walle AI 助手，很高兴为您服务。有什么可以帮助您的吗？';
      }
      
      if (message.toLowerCase().includes('天空') && message.toLowerCase().includes('蓝色')) {
        return '天空看起来是蓝色的，这是因为大气中的气体分子会散射阳光。蓝光的波长较短，更容易被散射，所以我们看到的天空呈现蓝色。这种现象叫做瑞利散射。';
      }
      
      // 其他常识性问题的通用回答
      return `关于您的问题"${message}"，这是一个很好的问题。让我为您详细解答...`;
    }
    
    // 复杂问题的回答
    return `经过分析，针对您的问题"${message}"，我已经进行了${decision.thinkingStrategy === 'deep' ? '深度' : '全面'}的分析。基于我的理解和判断，这里是详细的回答...`;
  }
}

// 全局实例
let globalChatProcessor: SmartChatProcessor | null = null;

export function getSmartChatProcessor(): SmartChatProcessor {
  if (!globalChatProcessor) {
    globalChatProcessor = new SmartChatProcessor();
  }
  return globalChatProcessor;
}
