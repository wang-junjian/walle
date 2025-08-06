// 智能体决策引擎
import OpenAI from 'openai';
import { Tool } from './agent-tools';

export interface DecisionContext {
  userMessage: string;
  conversationHistory: Array<{ role: string; content: string }>;
  availableTools: Tool[];
  currentGoal: string;
  constraints: string[];
}

export interface Decision {
  action: 'think' | 'use_tool' | 'respond' | 'collaborate' | 'clarify';
  reasoning: string;
  confidence: number; // 0-1
  toolName?: string;
  toolInput?: Record<string, unknown>;
  collaborationNeeded?: {
    expertise: string[];
    reason: string;
  };
  clarificationQuestions?: string[];
}

export class AgentDecisionEngine {
  private openai: OpenAI;
  private model: string;
  private language: string;

  constructor(openai: OpenAI, model: string, language: string = 'zh') {
    this.openai = openai;
    this.model = model;
    this.language = language;
  }

  // 智能决策：下一步应该做什么
  async makeDecision(context: DecisionContext): Promise<Decision> {
    const prompt = this.language === 'zh' 
      ? this.createChineseDecisionPrompt(context)
      : this.createEnglishDecisionPrompt(context);

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800,
        temperature: 0.3,
      });

      const result = response.choices[0]?.message?.content || '';
      return this.parseDecisionResponse(result);
    } catch (error) {
      console.error('决策失败:', error);
      return {
        action: 'respond',
        reasoning: this.language === 'zh' ? '决策过程出现错误，将直接回答' : 'Decision process failed, will respond directly',
        confidence: 0.1
      };
    }
  }

  // 评估是否需要工具
  async evaluateToolNeed(userMessage: string, availableTools: Tool[]): Promise<{
    needsTool: boolean;
    recommendedTool?: Tool;
    reasoning: string;
    confidence: number;
  }> {
    const toolDescriptions = availableTools.map(tool => 
      `- ${tool.name}: ${tool.description}`
    ).join('\n');

    const prompt = this.language === 'zh' 
      ? `分析以下用户请求是否需要使用工具：

用户请求：${userMessage}

可用工具：
${toolDescriptions}

请判断：
1. 是否需要使用工具？
2. 如果需要，推荐哪个工具？
3. 理由是什么？
4. 置信度如何（0-1）？

请以JSON格式回答：
{
  "needsTool": true/false,
  "recommendedTool": "工具名称或null",
  "reasoning": "详细理由",
  "confidence": 0.8
}`
      : `Analyze if the following user request needs tools:

User Request: ${userMessage}

Available Tools:
${toolDescriptions}

Please determine:
1. Does it need a tool?
2. If yes, which tool is recommended?
3. What's the reasoning?
4. What's the confidence level (0-1)?

Answer in JSON format:
{
  "needsTool": true/false,
  "recommendedTool": "tool_name or null",
  "reasoning": "detailed reasoning",
  "confidence": 0.8
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.2,
      });

      const result = response.choices[0]?.message?.content || '';
      const parsed = this.parseJsonResponse(result);
      
      return {
        needsTool: typeof parsed.needsTool === 'boolean' ? parsed.needsTool : false,
        recommendedTool: parsed.recommendedTool && typeof parsed.recommendedTool === 'string' ? 
          availableTools.find(t => t.name === parsed.recommendedTool) : undefined,
        reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : 'No reasoning provided',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5
      };
    } catch (error) {
      console.error('工具评估失败:', error);
      return {
        needsTool: false,
        reasoning: this.language === 'zh' ? '工具评估失败' : 'Tool evaluation failed',
        confidence: 0.1
      };
    }
  }

  // 生成工具输入参数
  async generateToolInput(userMessage: string, tool: Tool): Promise<Record<string, unknown>> {
    const prompt = this.language === 'zh'
      ? `根据用户请求生成工具调用参数：

用户请求：${userMessage}
工具名称：${tool.name}
工具描述：${tool.description}

请分析用户请求，生成合适的工具调用参数。
请以JSON格式返回参数，例如：
{
  "param1": "value1",
  "param2": "value2"
}`
      : `Generate tool input parameters based on user request:

User Request: ${userMessage}
Tool Name: ${tool.name}
Tool Description: ${tool.description}

Please analyze the user request and generate appropriate tool parameters.
Return as JSON format, example:
{
  "param1": "value1",
  "param2": "value2"
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.2,
      });

      const result = response.choices[0]?.message?.content || '{}';
      return this.parseJsonResponse(result) as Record<string, unknown>;
    } catch (error) {
      console.error('工具参数生成失败:', error);
      return {};
    }
  }

  private createChineseDecisionPrompt(context: DecisionContext): string {
    return `作为智能体，请分析当前情况并决定下一步行动：

用户请求：${context.userMessage}
当前目标：${context.currentGoal}
约束条件：${context.constraints.join(', ')}

可用工具：
${context.availableTools.map(t => `- ${t.name}: ${t.description}`).join('\n')}

对话历史：
${context.conversationHistory.slice(-3).map(h => `${h.role}: ${h.content}`).join('\n')}

请决定下一步应该：
1. think - 继续深度思考
2. use_tool - 使用工具
3. respond - 直接回答用户
4. collaborate - 需要多智能体协作
5. clarify - 需要澄清用户需求

请以JSON格式回答：
{
  "action": "选择的行动",
  "reasoning": "详细的推理过程",
  "confidence": 0.8,
  "toolName": "如果选择use_tool，指定工具名称",
  "collaborationNeeded": {
    "expertise": ["需要的专业领域"],
    "reason": "协作原因"
  },
  "clarificationQuestions": ["澄清问题1", "澄清问题2"]
}`;
  }

  private createEnglishDecisionPrompt(context: DecisionContext): string {
    return `As an agent, analyze the current situation and decide the next action:

User Request: ${context.userMessage}
Current Goal: ${context.currentGoal}
Constraints: ${context.constraints.join(', ')}

Available Tools:
${context.availableTools.map(t => `- ${t.name}: ${t.description}`).join('\n')}

Conversation History:
${context.conversationHistory.slice(-3).map(h => `${h.role}: ${h.content}`).join('\n')}

Please decide what to do next:
1. think - Continue deep thinking
2. use_tool - Use a tool
3. respond - Respond directly to user
4. collaborate - Need multi-agent collaboration
5. clarify - Need to clarify user requirements

Answer in JSON format:
{
  "action": "chosen_action",
  "reasoning": "detailed reasoning process",
  "confidence": 0.8,
  "toolName": "if use_tool, specify tool name",
  "collaborationNeeded": {
    "expertise": ["required expertise areas"],
    "reason": "collaboration reason"
  },
  "clarificationQuestions": ["clarification question 1", "clarification question 2"]
}`;
  }

  private parseDecisionResponse(response: string): Decision {
    try {
      const parsed = this.parseJsonResponse(response);
      const validActions = ['think', 'use_tool', 'respond', 'collaborate', 'clarify'] as const;
      const action = validActions.includes(parsed.action as typeof validActions[number]) ? 
        parsed.action as Decision['action'] : 'respond';
      
      return {
        action,
        reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : 'No reasoning provided',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
        toolName: typeof parsed.toolName === 'string' ? parsed.toolName : undefined,
        toolInput: parsed.toolInput && typeof parsed.toolInput === 'object' ? 
          parsed.toolInput as Record<string, unknown> : undefined,
        collaborationNeeded: parsed.collaborationNeeded && typeof parsed.collaborationNeeded === 'object' ? 
          parsed.collaborationNeeded as Decision['collaborationNeeded'] : undefined,
        clarificationQuestions: Array.isArray(parsed.clarificationQuestions) ? 
          parsed.clarificationQuestions as string[] : undefined
      };
    } catch (error) {
      console.error('解析决策结果失败:', error);
      return {
        action: 'respond',
        reasoning: this.language === 'zh' ? '解析失败，将直接回答' : 'Parse failed, will respond directly',
        confidence: 0.1
      };
    }
  }

  private parseJsonResponse(response: string): Record<string, unknown> {
    try {
      // 清理响应，移除代码块标记
      let cleanResponse = response.replace(/```json\s*|\s*```/g, '');
      
      // 找到第一个 { 和最后一个 }
      const firstBrace = cleanResponse.indexOf('{');
      const lastBrace = cleanResponse.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1) {
        cleanResponse = cleanResponse.substring(firstBrace, lastBrace + 1);
      }
      
      return JSON.parse(cleanResponse) as Record<string, unknown>;
    } catch (error) {
      console.error('JSON解析失败:', error, 'Response:', response);
      return {};
    }
  }
}

// 导出默认实例工厂
export const createDecisionEngine = (openai: OpenAI, model: string, language: string = 'zh') => {
  return new AgentDecisionEngine(openai, model, language);
};
