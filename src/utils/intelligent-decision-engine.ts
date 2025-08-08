// 智能决策引擎 - 基于 LLM 的智能判断系统
import { getConfigManager } from '../config/config-manager';

export interface IntelligentDecision {
  needsThinking: boolean;
  thinkingStrategy: 'none' | 'quick' | 'deep' | 'step-by-step';
  toolsRequired: string[];
  confidence: number;
  reasoning: string;
  estimatedComplexity: 'low' | 'medium' | 'high';
}

export class IntelligentDecisionEngine {
  private configManager = getConfigManager();
  
  // 智能判断用户请求的处理策略
  async analyzeUserRequest(message: string, context?: string): Promise<IntelligentDecision> {
    try {
      // 使用模型来判断是否需要代码执行
      const needsCodeExecution = await this.checkIfNeedsCodeExecution(message, context);
      
      if (needsCodeExecution) {
        return {
          needsThinking: true,
          thinkingStrategy: 'step-by-step',
          toolsRequired: ['code_execution'],
          confidence: 0.9,
          reasoning: '模型判断此问题需要代码执行来解决',
          estimatedComplexity: 'medium'
        };
      } else {
        // 对于不需要代码执行的问题，使用简化的决策
        return {
          needsThinking: false,
          thinkingStrategy: 'none',
          toolsRequired: [],
          confidence: 0.85,
          reasoning: '模型判断此问题可以直接回答，无需代码执行',
          estimatedComplexity: 'low'
        };
      }
    } catch (error) {
      console.error('智能决策失败，使用后备策略:', error);
      return this.fallbackDecision(message);
    }
  }
  
  // 使用模型判断是否需要代码执行
  private async checkIfNeedsCodeExecution(message: string, context?: string): Promise<boolean> {
    try {
      // 构建判断提示词
      const judgmentPrompt = this.buildCodeExecutionJudgmentPrompt(message, context);
      
      // 调用模型进行判断
      const result = await this.callModelForJudgment(judgmentPrompt);
      
      return result;
    } catch (error) {
      console.error('模型判断失败，使用后备逻辑:', error);
      // 如果模型调用失败，使用简化的后备逻辑
      return this.fallbackCodeExecutionCheck(message);
    }
  }
  
  // 构建代码执行判断提示词
  private buildCodeExecutionJudgmentPrompt(message: string, context?: string): string {
    return `
你是一个智能助手的决策引擎。请判断用户的问题是否需要通过编写和执行代码来解决。

用户问题：「${message}」
${context ? `对话上下文：${context}` : ''}

判断标准：
1. 需要代码执行的情况：
   - 数学计算（如：计算表达式、统计数字等）
   - 数据处理和分析
   - 算法实现和验证
   - 字符串处理（如：计算字符数量、查找模式等）
   - 文件操作模拟
   - 复杂逻辑运算

2. 不需要代码执行的情况：
   - 基础常识问答
   - 概念解释
   - 建议和意见
   - 创意写作
   - 简单对话
   - 历史知识

请只回答"是"或"否"，不要添加任何解释。

示例：
- "http://localhost:3000/这个字符串有几个0" → 是
- "计算 123 + 456" → 是
- "什么是人工智能" → 否
- "你好，今天天气怎么样" → 否
- "分析这组数据：[1,2,3,4,5]" → 是

回答：`;
  }
  
  // 调用模型进行判断
  private async callModelForJudgment(prompt: string): Promise<boolean> {
    // 获取第一个可用的模型配置
    const models = this.configManager.getAllModels();
    if (models.length === 0) {
      throw new Error('没有可用的模型配置');
    }
    
    const firstModel = models[0];
    if (!firstModel.apiKey || !firstModel.apiBase) {
      throw new Error('模型配置无效');
    }
    
    // 动态导入 OpenAI（避免在模块顶层导入）
    const { default: OpenAI } = await import('openai');
    
    const openai = new OpenAI({
      apiKey: firstModel.apiKey,
      baseURL: firstModel.apiBase,
    });
    
    const response = await openai.chat.completions.create({
      model: firstModel.model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 10, // 只需要简短回答
      temperature: 0.1, // 使用较低温度确保一致性
    });
    
    const answer = response.choices[0]?.message?.content?.trim().toLowerCase();
    
    // 判断回答
    if (answer?.includes('是') || answer?.includes('yes')) {
      return true;
    } else if (answer?.includes('否') || answer?.includes('no')) {
      return false;
    } else {
      // 如果回答不明确，使用后备逻辑
      console.warn('模型回答不明确:', answer);
      return this.fallbackCodeExecutionCheck(prompt);
    }
  }
  
  // 后备的代码执行检查逻辑
  private fallbackCodeExecutionCheck(message: string): boolean {
    // 简化的关键字检测，仅作为后备
    const codeIndicators = [
      /计算.*?\d/, // 计算相关
      /\d+.*?个/, // 数量统计
      /分析.*?数据/, // 数据分析
      /统计/, // 统计
      /[\d+\-*/()=]/, // 数学表达式
    ];
    
    return codeIndicators.some(pattern => pattern.test(message));
  }
  
  private buildAnalysisPrompt(message: string, context?: string): string {
    return `
你是一个智能助手的决策引擎，需要分析用户请求并决定最佳的处理策略。

用户请求：「${message}」
${context ? `对话上下文：${context}` : ''}

请分析以下方面：

1. 是否需要显示思考过程？
   - 简单问候、感谢 → 不需要
   - 基础常识问题 → 不需要或简单思考
   - 复杂计算、分析问题 → 需要详细思考
   - 多步骤任务 → 需要逐步思考

2. 思考策略：
   - none: 直接回答（问候、基础常识）
   - quick: 快速思考（简单计算、概念解释）
   - deep: 深度思考（复杂分析、决策问题）
   - step-by-step: 逐步思考（编程、多工具任务）

3. 需要哪些工具？
   - web_search: 需要最新信息、实时数据、特定查询
   - code_execution: 数学计算、编程问题、算法实现
   - calculator: 基础算术（已包含在 code_execution 中）
   - data_analysis: 数据统计、分析
   - file_operation: 文件读写操作
   - code_analysis: 代码质量检查

4. 复杂度评估：
   - low: 简单问题，直接回答
   - medium: 需要一定分析或工具辅助
   - high: 复杂多步骤任务

请返回 JSON 格式：
{
  "needsThinking": boolean,
  "thinkingStrategy": "none|quick|deep|step-by-step",
  "toolsRequired": ["tool1", "tool2"], // 空数组表示不需要工具
  "confidence": 0.0-1.0,
  "reasoning": "决策理由",
  "estimatedComplexity": "low|medium|high"
}

示例：
- "你好" → {"needsThinking": false, "thinkingStrategy": "none", "toolsRequired": [], "confidence": 0.95, "reasoning": "简单问候", "estimatedComplexity": "low"}
- "天空为什么是蓝色的" → {"needsThinking": false, "thinkingStrategy": "none", "toolsRequired": [], "confidence": 0.9, "reasoning": "基础科学常识", "estimatedComplexity": "low"}
- "计算 3333.3*4444.4" → {"needsThinking": true, "thinkingStrategy": "quick", "toolsRequired": ["code_execution"], "confidence": 0.95, "reasoning": "数学计算需要工具辅助", "estimatedComplexity": "medium"}
- "今天北京的天气如何" → {"needsThinking": true, "thinkingStrategy": "quick", "toolsRequired": ["web_search"], "confidence": 0.9, "reasoning": "需要实时天气信息", "estimatedComplexity": "medium"}
`;
  }
  
  private async callLLMForDecision(prompt: string): Promise<IntelligentDecision> {
    // 这里应该调用实际的 LLM API
    // 由于当前环境限制，使用智能的基于规则的判断
    
    const message = prompt.toLowerCase();
    
    // 1. 问候和社交对话
    if (this.isGreeting(message)) {
      return {
        needsThinking: false,
        thinkingStrategy: 'none',
        toolsRequired: [],
        confidence: 0.95,
        reasoning: '简单社交对话，直接回答即可',
        estimatedComplexity: 'low'
      };
    }
    
    // 2. 基础常识问题
    if (this.isBasicKnowledge(message)) {
      return {
        needsThinking: false,
        thinkingStrategy: 'none',
        toolsRequired: [],
        confidence: 0.9,
        reasoning: '基础常识问题，模型可以直接回答',
        estimatedComplexity: 'low'
      };
    }
    
    // 3. 数学计算
    if (this.isMathCalculation(message)) {
      return {
        needsThinking: true,
        thinkingStrategy: 'quick',
        toolsRequired: ['code_execution'],
        confidence: 0.95,
        reasoning: '数学计算需要代码执行工具确保准确性',
        estimatedComplexity: 'medium'
      };
    }
    
    // 4. 实时信息查询
    if (this.needsRealTimeInfo(message)) {
      return {
        needsThinking: true,
        thinkingStrategy: 'quick',
        toolsRequired: ['web_search'],
        confidence: 0.9,
        reasoning: '需要搜索最新的实时信息',
        estimatedComplexity: 'medium'
      };
    }
    
    // 5. 编程和技术问题
    if (this.isProgrammingTask(message)) {
      return {
        needsThinking: true,
        thinkingStrategy: 'step-by-step',
        toolsRequired: ['code_execution'],
        confidence: 0.85,
        reasoning: '编程问题需要逐步分析和实现',
        estimatedComplexity: 'high'
      };
    }
    
    // 6. 复杂分析问题
    if (this.isComplexAnalysis(message)) {
      return {
        needsThinking: true,
        thinkingStrategy: 'deep',
        toolsRequired: [],
        confidence: 0.8,
        reasoning: '复杂分析问题需要深度思考',
        estimatedComplexity: 'high'
      };
    }
    
    // 7. 明确的搜索请求
    if (this.isExplicitSearch(message)) {
      return {
        needsThinking: true,
        thinkingStrategy: 'quick',
        toolsRequired: ['web_search'],
        confidence: 0.9,
        reasoning: '用户明确要求搜索信息',
        estimatedComplexity: 'medium'
      };
    }
    
    // 默认策略：简单回答
    return {
      needsThinking: false,
      thinkingStrategy: 'none',
      toolsRequired: [],
      confidence: 0.7,
      reasoning: '一般问题，尝试直接回答',
      estimatedComplexity: 'low'
    };
  }
  
  // 智能判断方法 - 减少关键字依赖，增加语义理解
  private isGreeting(message: string): boolean {
    // 使用更智能的模式而不是简单的关键字匹配
    const greetingPatterns = [
      /^(你好|hi|hello|hey|嗨)([！!。.]?$|[，,\s])/i,
      /^(谢谢|thank you|thanks)([！!。.]?$)/i,
      /^(再见|bye|goodbye|拜拜)([！!。.]?$)/i,
      /^(早上好|晚上好|下午好|good morning|good evening)([！!。.]?$)/i
    ];
    
    return greetingPatterns.some(pattern => pattern.test(message));
  }
  
  private isBasicKnowledge(message: string): boolean {
    // 科学常识、历史知识、基本概念等
    const knowledgeIndicators = [
      /^(什么是|what is|define)/i,
      /^(为什么|why).*?(是|会|能|要)/,
      /^(解释|explain|介绍|introduce)/,
      /(历史|文化|地理|生物|物理|化学).*?(是什么|意思|概念)/,
      /天空.*?蓝色|重力.*?原理|光.*?传播/
    ];
    
    // 排除需要实时信息的情况
    const excludePatterns = [
      /(今天|现在|最新|当前|2024|2025)/,
      /(价格|股价|汇率|天气)/,
      /(新闻|动态|发展|趋势)/
    ];
    
    const isKnowledge = knowledgeIndicators.some(pattern => pattern.test(message));
    const needsRealTime = excludePatterns.some(pattern => pattern.test(message));
    
    return isKnowledge && !needsRealTime;
  }
  
  private isMathCalculation(message: string): boolean {
    // 数学表达式检测
    const mathPatterns = [
      /^\s*[\d\s+\-*/().=]+\s*$/,  // 纯数学表达式
      /^\s*[\d\s+\-*/().]+\s*=\s*$/,  // 带等号
      /^(计算|求解?|算出?)[:：]?\s*[\d\s+\-*/().]+/,
      /[\d+\-*/()=].*?(等于|结果|答案)/,
      /^[\d.,]+\s*[+\-*/×÷]\s*[\d.,]+/  // 基本运算
    ];
    
    return mathPatterns.some(pattern => pattern.test(message));
  }
  
  private needsRealTimeInfo(message: string): boolean {
    const realTimeIndicators = [
      /(今天|现在|当前|实时|最新).*?(天气|气温|温度)/,
      /(股票|股价|比特币|汇率).*?(价格|行情)/,
      /(今日|最新).*?(新闻|消息|动态)/,
      /2024|2025年.*?(发展|变化|情况)/,
      /(疫情|病毒).*?(最新|当前|现状)/
    ];
    
    return realTimeIndicators.some(pattern => pattern.test(message));
  }
  
  private isProgrammingTask(message: string): boolean {
    const programmingIndicators = [
      /```[\w]*[\s\S]*?```/,  // 代码块
      /(写|编写|实现).*?(代码|程序|函数|算法)/,
      /(如何|怎么).*?(编程|coding|开发)/,
      /(debug|调试|修复).*?(代码|bug)/,
      /\b(function|class|def|var|let|const)\b/i,
      /(javascript|python|java|typescript|sql).*?(代码|实现)/i
    ];
    
    return programmingIndicators.some(pattern => pattern.test(message));
  }
  
  private isComplexAnalysis(message: string): boolean {
    const analysisIndicators = [
      /(分析|分析一下|深入分析).*?(问题|情况|原因|影响)/,
      /(比较|对比).*?(优缺点|差异|区别)/,
      /(评估|评价).*?(方案|选择|策略)/,
      /(如何解决|解决方案|建议).*?(复杂|困难|挑战)/,
      /(设计|规划|制定).*?(方案|计划|策略)/
    ];
    
    return analysisIndicators.some(pattern => pattern.test(message));
  }
  
  private isExplicitSearch(message: string): boolean {
    const searchIndicators = [
      /^(搜索|查找|查询|search).*?(信息|资料|内容)/,
      /(帮我|帮忙).*?(找|查|搜)/,
      /.*?(官网|网站|链接)/,
      /(了解|想知道).*?(公司|产品|服务)/
    ];
    
    return searchIndicators.some(pattern => pattern.test(message));
  }
  
  // 后备决策逻辑
  private fallbackDecision(message: string): IntelligentDecision {
    const lowerMessage = message.toLowerCase();
    
    // 数学计算
    if (/[\d+\-*/()=]/.test(message)) {
      return {
        needsThinking: true,
        thinkingStrategy: 'quick',
        toolsRequired: ['code_execution'],
        confidence: 0.8,
        reasoning: '检测到数学表达式',
        estimatedComplexity: 'medium'
      };
    }
    
    // 搜索相关
    if (lowerMessage.includes('搜索') || lowerMessage.includes('查找') || lowerMessage.includes('最新')) {
      return {
        needsThinking: true,
        thinkingStrategy: 'quick',
        toolsRequired: ['web_search'],
        confidence: 0.7,
        reasoning: '可能需要搜索信息',
        estimatedComplexity: 'medium'
      };
    }
    
    // 默认：简单回答
    return {
      needsThinking: false,
      thinkingStrategy: 'none',
      toolsRequired: [],
      confidence: 0.6,
      reasoning: '使用基础回答策略',
      estimatedComplexity: 'low'
    };
  }
}

// 全局实例
let globalDecisionEngine: IntelligentDecisionEngine | null = null;

export function getDecisionEngine(): IntelligentDecisionEngine {
  if (!globalDecisionEngine) {
    globalDecisionEngine = new IntelligentDecisionEngine();
  }
  return globalDecisionEngine;
}
