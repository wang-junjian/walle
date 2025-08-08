import OpenAI from 'openai';
import { AgentThought } from '@/types/chat';
import { AVAILABLE_TOOLS, selectToolsForTask, Tool } from '@/utils/agent-tools';
import { getModelConfig } from '@/config/config-manager';

interface ModelConfig {
  maxTokens?: number;
  temperature?: number;
  contextLength?: number;
}

// 智能体基类
export abstract class BaseAgent {
  protected openai: OpenAI;
  protected model: string;
  protected language: string;
  protected availableTools: Record<string, Tool>;
  protected modelConfig: ModelConfig;
  
  constructor(openai: OpenAI, model: string, language: string = 'zh') {
    this.openai = openai;
    this.model = model;
    this.language = language;
    this.availableTools = AVAILABLE_TOOLS;
    
    // 获取模型配置
    const configFromFile = getModelConfig(model);
    this.modelConfig = {
      maxTokens: configFromFile?.maxTokens || 1000,
      temperature: configFromFile?.temperature || 0.7,
      contextLength: configFromFile?.contextLength || 32768
    };
  }
  
  // 获取适合特定任务的参数
  protected getTaskParams(taskType: 'observe' | 'think' | 'action' | 'reflect' | 'summary') {
    const baseMaxTokens = this.modelConfig.maxTokens || 1000;
    const baseTemperature = this.modelConfig.temperature || 0.7;
    const contextLength = this.modelConfig.contextLength || 4096;
    
    // 确保 max_tokens 不超过上下文长度的合理比例，为输入预留空间
    const safeMaxTokens = Math.min(baseMaxTokens, Math.floor(contextLength * 0.8)); // 使用上下文的80%作为最大输出
    
    switch (taskType) {
      case 'observe':
        return {
          max_tokens: Math.min(safeMaxTokens, 800),
          temperature: Math.min(baseTemperature, 0.3) // 观察需要较低温度
        };
      case 'think':
        return {
          max_tokens: Math.min(safeMaxTokens, 1500),
          temperature: Math.min(baseTemperature, 0.4) // 思考稍微提高创造性
        };
      case 'action':
        return {
          max_tokens: Math.min(safeMaxTokens, 800),
          temperature: Math.min(baseTemperature, 0.3) // 执行需要精确性
        };
      case 'reflect':
        return {
          max_tokens: Math.min(safeMaxTokens, 800),
          temperature: Math.min(baseTemperature, 0.3) // 反思需要理性
        };
      case 'summary':
        return {
          max_tokens: Math.min(safeMaxTokens, 300),
          temperature: Math.min(baseTemperature, 0.2) // 总结需要简洁准确
        };
      default:
        return {
          max_tokens: Math.min(safeMaxTokens, 1000),
          temperature: baseTemperature
        };
    }
  }
  
  abstract getName(): string;
  abstract getRole(): string;
  abstract getExpertise(): string[];
  
  // 观察和分析
  async observe(userMessage: string, context?: Record<string, unknown>): Promise<AgentThought> {
    const thought: AgentThought = {
      id: `obs-${Date.now()}`,
      type: 'observation',
      title: this.language === 'zh' ? '观察分析' : 'Observation',
      content: this.language === 'zh' ? '正在观察和分析用户请求...' : 'Observing and analyzing user request...',
      timestamp: new Date(),
      status: 'running'
    };
    
    // 分析用户请求
    const analysisPrompt = this.language === 'zh' ? 
      `作为${this.getRole()}，请观察和分析以下用户请求：
      
用户请求："${userMessage}"
${context ? `上下文：${JSON.stringify(context)}` : ''}

请从专业角度分析：
1. 用户的核心需求是什么？
2. 这个问题涉及哪些关键方面？
3. 需要哪些信息才能很好地回答？
4. 可能存在哪些挑战或风险？

请简洁但深入地分析。` :
      `As a ${this.getRole()}, please observe and analyze the following user request:
      
User Request: "${userMessage}"
${context ? `Context: ${JSON.stringify(context)}` : ''}

Please analyze from a professional perspective:
1. What is the user's core need?
2. What key aspects does this problem involve?
3. What information is needed to answer well?
4. What challenges or risks might exist?

Please provide a concise but in-depth analysis.`;
    
    try {
      const taskParams = this.getTaskParams('observe');
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: analysisPrompt }],
        ...taskParams,
      });
      
      thought.content = response.choices[0]?.message?.content || thought.content;
      thought.status = 'completed';
    } catch (err) {
      thought.content = this.language === 'zh' ? '观察分析时遇到错误' : 'Error during observation';
      thought.status = 'error';
      console.error('观察阶段错误:', err);
    }
    
    return thought;
  }

  // 流式观察和分析
  async observeStream(
    userMessage: string, 
    context: Record<string, unknown> | undefined,
    onUpdate: (thought: AgentThought) => void
  ): Promise<AgentThought> {
    const thought: AgentThought = {
      id: `obs-${Date.now()}`,
      type: 'observation',
      title: this.language === 'zh' ? '观察分析' : 'Observation',
      content: '',
      timestamp: new Date(),
      status: 'running'
    };
    
    // 初始状态回调
    const initialContent = this.language === 'zh' ? '正在观察和分析用户请求...' : 'Observing and analyzing user request...';
    console.log('观察阶段开始:', { thoughtId: thought.id, initialContent });
    onUpdate({ ...thought, content: initialContent });
    
    const analysisPrompt = this.language === 'zh' ? 
      `作为${this.getRole()}，请观察和分析以下用户请求：
      
用户请求："${userMessage}"
${context ? `上下文：${JSON.stringify(context)}` : ''}

请从专业角度分析：
1. 用户的核心需求是什么？
2. 这个问题涉及哪些关键方面？
3. 需要哪些信息才能很好地回答？
4. 可能存在哪些挑战或风险？

请简洁但深入地分析。` :
      `As a ${this.getRole()}, please observe and analyze the following user request:
      
User Request: "${userMessage}"
${context ? `Context: ${JSON.stringify(context)}` : ''}

Please analyze from a professional perspective:
1. What is the user's core need?
2. What key aspects does this problem involve?
3. What information is needed to answer well?
4. What challenges or risks might exist?

Please provide a concise but in-depth analysis.`;
    
    try {
      const taskParams = this.getTaskParams('observe');
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: analysisPrompt }],
        ...taskParams,
        stream: true,
      });
      
      let accumulatedContent = '';
      for await (const chunk of response) {
        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          accumulatedContent += delta;
          thought.content = accumulatedContent;
          console.log('观察阶段流式更新:', { 
            thoughtId: thought.id, 
            deltaLength: delta.length,
            totalLength: accumulatedContent.length,
            preview: accumulatedContent.substring(0, 50) + '...'
          });
          onUpdate({ ...thought });
        }
      }
      
      thought.status = 'completed';
      console.log('观察阶段完成:', { 
        thoughtId: thought.id, 
        finalLength: thought.content?.length || 0 
      });
      onUpdate({ ...thought });
    } catch (err) {
      thought.content = this.language === 'zh' ? '观察分析时遇到错误' : 'Error during observation';
      thought.status = 'error';
      onUpdate({ ...thought });
      console.error('流式观察错误:', err);
    }
    
    return thought;
  }
  
  // 深度思考
  async think(observation: string, userMessage: string): Promise<AgentThought> {
    const thought: AgentThought = {
      id: `think-${Date.now()}`,
      type: 'thought',
      title: this.language === 'zh' ? '深度思考' : 'Deep Thinking',
      content: this.language === 'zh' ? '正在进行深度思考和推理...' : 'Conducting deep thinking and reasoning...',
      timestamp: new Date(),
      status: 'running',
      reasoning_steps: [],
      alternatives: []
    };
    
    const thinkingPrompt = this.language === 'zh' ?
      `基于以下观察分析，请进行深度思考：

观察结果：${observation}
用户原始请求：${userMessage}

请提供结构化的思考过程，包括：
1. 逐步推理过程（每步包含描述、结论和置信度0-1）
2. 至少2个解决方案（包含优缺点和可行性评分0-1）

请以JSON格式回复：
{
  "reasoning_steps": [
    {"step": 1, "description": "推理描述", "conclusion": "结论", "confidence": 0.8}
  ],
  "alternatives": [
    {"option": "方案名称", "pros": ["优点1"], "cons": ["缺点1"], "feasibility": 0.8}
  ],
  "final_recommendation": "最终建议"
}` :
      `Based on the following observation, please conduct deep thinking:

Observation: ${observation}
Original User Request: ${userMessage}

Please provide a structured thinking process including:
1. Step-by-step reasoning (each step with description, conclusion, and confidence 0-1)
2. At least 2 solutions (with pros/cons and feasibility score 0-1)

Please reply in JSON format:
{
  "reasoning_steps": [
    {"step": 1, "description": "reasoning description", "conclusion": "conclusion", "confidence": 0.8}
  ],
  "alternatives": [
    {"option": "solution name", "pros": ["pro1"], "cons": ["con1"], "feasibility": 0.8}
  ],
  "final_recommendation": "final recommendation"
}`;
    
    try {
      const taskParams = this.getTaskParams('think');
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: thinkingPrompt }],
        ...taskParams,
      });
      
      const result = response.choices[0]?.message?.content || '';
      
      try {
        // 清理和解析JSON
        let cleanResult = result.replace(/```json\n?|\n?```/g, '');
        const firstBrace = cleanResult.indexOf('{');
        const lastBrace = cleanResult.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1) {
          cleanResult = cleanResult.substring(firstBrace, lastBrace + 1);
        }
        
        const parsed = JSON.parse(cleanResult);
        
        thought.reasoning_steps = parsed.reasoning_steps || [];
        thought.alternatives = parsed.alternatives || [];
        thought.content = parsed.final_recommendation || (this.language === 'zh' ? '深度思考完成' : 'Deep thinking completed');
      } catch (parseErr) {
        thought.content = result; // 如果解析失败，使用原始内容
        console.error('JSON解析失败:', parseErr);
      }
      
      thought.status = 'completed';
    } catch (err) {
      thought.content = this.language === 'zh' ? '思考过程中遇到错误' : 'Error during thinking';
      thought.status = 'error';
      console.error('思考阶段错误:', err);
    }
    
    return thought;
  }

  // 流式深度思考
  async thinkStream(
    observation: string, 
    userMessage: string,
    onUpdate: (thought: AgentThought) => void
  ): Promise<AgentThought> {
    const thought: AgentThought = {
      id: `think-${Date.now()}`,
      type: 'thought',
      title: this.language === 'zh' ? '深度思考' : 'Deep Thinking',
      content: '',
      timestamp: new Date(),
      status: 'running',
      reasoning_steps: [],
      alternatives: []
    };
    
    // 初始状态回调
    onUpdate({ ...thought, content: this.language === 'zh' ? '正在进行深度思考和推理...' : 'Conducting deep thinking and reasoning...' });
    
    const thinkingPrompt = this.language === 'zh' ?
      `基于以下观察分析，请进行深度思考并逐步展示你的思考过程：

观察结果：${observation}
用户原始请求：${userMessage}

请逐步阐述你的思考过程，包括：
1. 问题理解和分析
2. 关键要素识别
3. 多种解决方案的权衡
4. 最终建议

请用清晰的思路逐步展开，不需要JSON格式。` :
      `Based on the following observation, please conduct deep thinking and show your thought process step by step:

Observation: ${observation}
Original User Request: ${userMessage}

Please elaborate your thinking process step by step, including:
1. Problem understanding and analysis
2. Key element identification
3. Weighing multiple solutions
4. Final recommendation

Please develop your thoughts clearly step by step, no JSON format needed.`;
    
    try {
      const taskParams = this.getTaskParams('think');
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: thinkingPrompt }],
        ...taskParams,
        stream: true,
      });
      
      let accumulatedContent = '';
      for await (const chunk of response) {
        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          accumulatedContent += delta;
          thought.content = accumulatedContent;
          onUpdate({ ...thought });
        }
      }
      
      thought.status = 'completed';
      onUpdate({ ...thought });
    } catch (err) {
      thought.content = this.language === 'zh' ? '思考过程中遇到错误' : 'Error during thinking';
      thought.status = 'error';
      onUpdate({ ...thought });
      console.error('流式思考错误:', err);
    }
    
    return thought;
  }
  
  // 执行操作
  async executeAction(userMessage: string, toolName?: string): Promise<AgentThought> {
    const thought: AgentThought = {
      id: `action-${Date.now()}`,
      type: 'action',
      title: this.language === 'zh' ? '执行操作' : 'Execute Action',
      content: this.language === 'zh' ? '正在执行相关操作...' : 'Executing action...',
      timestamp: new Date(),
      status: 'running'
    };
    
    try {
      // 选择工具
      let tool: Tool;
      
      if (toolName) {
        // 直接使用指定的工具名称
        tool = this.availableTools[toolName];
        if (!tool) {
          thought.content = this.language === 'zh' ? '指定的工具不可用' : 'Specified tool not available';
          thought.status = 'error';
          return thought;
        }
      } else {
        // 根据用户消息选择工具
        const selectedTools = await selectToolsForTask(userMessage);
        
        if (selectedTools.length === 0) {
          thought.content = this.language === 'zh' ? '未找到适合的工具执行此操作' : 'No suitable tools found for this action';
          thought.status = 'completed';
          return thought;
        }
        
        // 使用第一个选中的工具
        tool = selectedTools[0];
      }
      
      // 生成工具输入
      const toolInput = await this.generateToolInput(userMessage, tool);
      
      thought.tool_name = tool.name;
      thought.tool_input = toolInput;
      
      // 执行工具
      const toolOutput = await tool.execute(toolInput);
      
      thought.tool_output = toolOutput;
      thought.content = this.language === 'zh' ? 
        `使用${tool.description}成功完成操作` : 
        `Successfully completed action using ${tool.description}`;
      thought.status = 'completed';
      
    } catch (err) {
      thought.content = this.language === 'zh' ? 
        `执行操作时遇到错误：${err}` : 
        `Error executing action: ${err}`;
      thought.status = 'error';
      console.error('执行操作错误:', err);
    }
    
    return thought;
  }

  // 流式执行操作
  async executeActionStream(
    userMessage: string, 
    toolName: string | undefined,
    onUpdate: (thought: AgentThought) => void
  ): Promise<AgentThought> {
    const thought: AgentThought = {
      id: `action-${Date.now()}`,
      type: 'action',
      title: this.language === 'zh' ? '执行操作' : 'Execute Action',
      content: '',
      timestamp: new Date(),
      status: 'running'
    };
    
    // 初始状态回调
    onUpdate({ ...thought, content: this.language === 'zh' ? '正在分析需要执行的操作...' : 'Analyzing action to execute...' });
    
    try {
      // 选择工具
      let tool: Tool;
      
      if (toolName) {
        tool = this.availableTools[toolName];
        if (!tool) {
          thought.content = this.language === 'zh' ? '指定的工具不可用' : 'Specified tool not available';
          thought.status = 'error';
          onUpdate({ ...thought });
          return thought;
        }
      } else {
        const selectedTools = await selectToolsForTask(userMessage);
        
        if (selectedTools.length === 0) {
          thought.content = this.language === 'zh' ? '未找到适合的工具执行此操作' : 'No suitable tools found for this action';
          thought.status = 'completed';
          onUpdate({ ...thought });
          return thought;
        }
        
        tool = selectedTools[0];
      }
      
      // 报告找到的工具
      onUpdate({ 
        ...thought, 
        content: this.language === 'zh' ? 
          `找到合适的工具: ${tool.description}，正在准备执行...` : 
          `Found suitable tool: ${tool.description}, preparing to execute...`
      });
      
      // 生成工具输入
      const toolInput = await this.generateToolInput(userMessage, tool);
      thought.tool_name = tool.name;
      thought.tool_input = toolInput;
      
      onUpdate({ 
        ...thought, 
        content: this.language === 'zh' ? 
          `正在执行${tool.description}...` : 
          `Executing ${tool.description}...`
      });
      
      // 执行工具
      const toolOutput = await tool.execute(toolInput);
      thought.tool_output = toolOutput;
      
      thought.content = this.language === 'zh' ? 
        `使用${tool.description}成功完成操作` : 
        `Successfully completed action using ${tool.description}`;
      thought.status = 'completed';
      onUpdate({ ...thought });
      
    } catch (err) {
      thought.content = this.language === 'zh' ? 
        `执行操作时遇到错误：${err}` : 
        `Error executing action: ${err}`;
      thought.status = 'error';
      onUpdate({ ...thought });
      console.error('流式执行操作错误:', err);
    }
    
    return thought;
  }
  
  // 反思总结
  async reflect(previousThoughts: AgentThought[], finalResult: string): Promise<AgentThought> {
    const thought: AgentThought = {
      id: `reflect-${Date.now()}`,
      type: 'reflection',
      title: this.language === 'zh' ? '反思总结' : 'Reflection',
      content: this.language === 'zh' ? '正在反思整个处理过程...' : 'Reflecting on the entire process...',
      timestamp: new Date(),
      status: 'running'
    };
    
    const reflectionPrompt = this.language === 'zh' ?
      `请反思以下处理过程：

处理步骤：
${previousThoughts.map((t, i) => `${i + 1}. ${t.type}: ${t.content.substring(0, 100)}...`).join('\n')}

最终结果：${finalResult}

请分析：
1. 处理过程是否合理有效？
2. 是否有可以改进的地方？
3. 对类似问题的建议？

请提供简洁的反思总结。` :
      `Please reflect on the following process:

Processing Steps:
${previousThoughts.map((t, i) => `${i + 1}. ${t.type}: ${t.content.substring(0, 100)}...`).join('\n')}

Final Result: ${finalResult}

Please analyze:
1. Is the process reasonable and effective?
2. Are there areas for improvement?
3. Recommendations for similar problems?

Please provide a concise reflection summary.`;
    
    try {
      const taskParams = this.getTaskParams('reflect');
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: reflectionPrompt }],
        ...taskParams,
      });
      
      const reflection = response.choices[0]?.message?.content || '';
      
      // 生成改进建议
      const improvementPrompt = this.language === 'zh' ?
        `基于以上反思，请提供1-2条具体的改进建议：` :
        `Based on the above reflection, please provide 1-2 specific improvement suggestions:`;
      
      const summaryParams = this.getTaskParams('summary');
      const improvementResponse = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'user', content: reflectionPrompt },
          { role: 'assistant', content: reflection },
          { role: 'user', content: improvementPrompt }
        ],
        ...summaryParams,
      });
      
      thought.content = reflection;
      thought.reflection = reflection;
      thought.improvement = improvementResponse.choices[0]?.message?.content || '';
      thought.status = 'completed';
      
    } catch (err) {
      thought.content = this.language === 'zh' ? '反思过程中遇到错误' : 'Error during reflection';
      thought.status = 'error';
      console.error('反思阶段错误:', err);
    }
    
    return thought;
  }

  // 流式反思总结
  async reflectStream(
    previousThoughts: AgentThought[], 
    finalResult: string,
    onUpdate: (thought: AgentThought) => void
  ): Promise<AgentThought> {
    const thought: AgentThought = {
      id: `reflect-${Date.now()}`,
      type: 'reflection',
      title: this.language === 'zh' ? '反思总结' : 'Reflection',
      content: '',
      timestamp: new Date(),
      status: 'running'
    };
    
    // 初始状态回调
    onUpdate({ ...thought, content: this.language === 'zh' ? '正在反思整个处理过程...' : 'Reflecting on the entire process...' });
    
    const reflectionPrompt = this.language === 'zh' ?
      `请反思以下处理过程并提供详细的分析：

处理步骤：
${previousThoughts.map((t, i) => `${i + 1}. ${t.type}: ${t.content.substring(0, 100)}...`).join('\n')}

最终结果：${finalResult}

请详细分析：
1. 处理过程是否合理有效？
2. 各个步骤的执行情况如何？
3. 是否有可以改进的地方？
4. 对类似问题的建议？

请逐步展开你的思考过程。` :
      `Please reflect on the following process and provide detailed analysis:

Processing Steps:
${previousThoughts.map((t, i) => `${i + 1}. ${t.type}: ${t.content.substring(0, 100)}...`).join('\n')}

Final Result: ${finalResult}

Please analyze in detail:
1. Is the process reasonable and effective?
2. How did each step perform?
3. Are there areas for improvement?
4. Recommendations for similar problems?

Please develop your thinking process step by step.`;
    
    try {
      const taskParams = this.getTaskParams('reflect');
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: reflectionPrompt }],
        ...taskParams,
        stream: true,
      });
      
      let accumulatedContent = '';
      for await (const chunk of response) {
        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          accumulatedContent += delta;
          thought.content = accumulatedContent;
          onUpdate({ ...thought });
        }
      }
      
      thought.reflection = accumulatedContent;
      thought.status = 'completed';
      onUpdate({ ...thought });
      
    } catch (err) {
      thought.content = this.language === 'zh' ? '反思过程中遇到错误' : 'Error during reflection';
      thought.status = 'error';
      onUpdate({ ...thought });
      console.error('流式反思错误:', err);
    }
    
    return thought;
  }
  
  // 生成工具输入
  private async generateToolInput(userMessage: string, tool: Tool): Promise<Record<string, unknown>> {
    // 为不同工具生成特定的输入参数
    switch (tool.name) {
      case 'web_search':
        return this.generateSearchInput(userMessage);
      case 'code_execution':
        return this.generateCodeExecutionInput(userMessage);
      default:
        return this.generateGenericToolInput(userMessage, tool);
    }
  }
  
  private async generateSearchInput(userMessage: string): Promise<Record<string, unknown>> {
    // 提取搜索关键词和类型
    let searchType: 'general' | 'technical' | 'news' | 'academic' = 'general';
    
    if (/技术|api|文档|documentation|technical/i.test(userMessage)) {
      searchType = 'technical';
    } else if (/新闻|news|最新|latest|动态/i.test(userMessage)) {
      searchType = 'news';
    } else if (/学术|论文|research|academic|paper/i.test(userMessage)) {
      searchType = 'academic';
    }
    
    // 提取搜索查询
    let query = userMessage;
    
    // 简化查询，移除一些停用词和指示词
    const stopWords = ['搜索', '查找', '告诉我', '什么是', 'search', 'find', 'tell me', 'what is'];
    for (const stopWord of stopWords) {
      query = query.replace(new RegExp(stopWord, 'gi'), '').trim();
    }
    
    return {
      query: query || userMessage,
      searchType,
      maxResults: 5,
      language: this.language === 'zh' ? 'zh' : 'en'
    };
  }
  
  private async generateCodeExecutionInput(userMessage: string): Promise<Record<string, unknown>> {
    // 提取代码块
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/;
    const codeMatch = userMessage.match(codeBlockRegex);
    
    if (codeMatch) {
      const language = codeMatch[1] || 'javascript';
      const code = codeMatch[2].trim();
      
      return {
        code,
        language: this.normalizeLanguage(language),
        enableDebug: /debug|调试/.test(userMessage.toLowerCase()),
        timeout: 5000
      };
    }
    
    // 如果没有代码块，尝试识别内联代码或表达式
    const inlineCodeRegex = /`([^`]+)`/;
    const inlineMatch = userMessage.match(inlineCodeRegex);
    
    if (inlineMatch) {
      return {
        code: inlineMatch[1],
        language: 'javascript',
        enableDebug: false,
        timeout: 5000
      };
    }
    
    // 纯数学表达式检测（增强版）
    const mathOnlyPatterns = [
      /^\s*[\d\s+\-*/().=]+\s*$/, // 纯数学表达式
      /^\s*[\d\s+\-*/().]+\s*=\s*$/, // 带等号的数学表达式
      /^\s*计算[:：]?\s*([\d\s+\-*/().]+)/, // "计算: 1+2*3"
      /^\s*求解?[:：]?\s*([\d\s+\-*/().]+)/, // "求: 1+2"
    ];
    
    for (const pattern of mathOnlyPatterns) {
      const match = userMessage.match(pattern);
      if (match) {
        let expression = match[1] || match[0];
        // 清理表达式，移除不必要的字符
        expression = expression.replace(/[=\s计算求解：:]/g, '').trim();
        
        // 确保表达式有效
        if (/^[\d+\-*/.()]+$/.test(expression)) {
          return {
            code: `console.log("计算结果:", ${expression});`,
            language: 'javascript',
            enableDebug: false,
            timeout: 5000
          };
        }
      }
    }
    
    // 复杂数学问题检测
    const complexMathRegex = /(?:计算|求|算出?).*?([\d\s+\-*/().]+)/;
    const complexMatch = userMessage.match(complexMathRegex);
    
    if (complexMatch) {
      const expression = complexMatch[1].replace(/\s/g, '');
      if (/^[\d+\-*/.()]+$/.test(expression)) {
        return {
          code: `
// 数学计算
const result = ${expression};
console.log("表达式: ${expression}");
console.log("计算结果:", result);
          `.trim(),
          language: 'javascript',
          enableDebug: false,
          timeout: 5000
        };
      }
    }
    
    // 数据分析相关代码生成
    if (/数据分析|统计|平均值|求和/.test(userMessage)) {
      return {
        code: `
// 数据分析示例
const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const sum = data.reduce((a, b) => a + b, 0);
const mean = sum / data.length;
const max = Math.max(...data);
const min = Math.min(...data);

console.log("数据:", data);
console.log("总和:", sum);
console.log("平均值:", mean.toFixed(2));
console.log("最大值:", max);
console.log("最小值:", min);
        `.trim(),
        language: 'javascript',
        enableDebug: true,
        timeout: 5000
      };
    }
    
    // 通用数学表达式检测
    const generalMathRegex = /[\d+\-*/()=]/;
    if (generalMathRegex.test(userMessage)) {
      // 提取所有数字和运算符
      const extracted = userMessage.match(/[\d+\-*/.()=]+/g);
      if (extracted && extracted.length > 0) {
        const expression = extracted.join('').replace(/=+$/, '');
        if (/^[\d+\-*/.()]+$/.test(expression)) {
          return {
            code: `
// 自动提取的数学表达式
const expression = "${expression}";
const result = ${expression};
console.log(\`计算 \${expression} = \${result}\`);
            `.trim(),
            language: 'javascript',
            enableDebug: false,
            timeout: 5000
          };
        }
      }
    }
    
    // 默认返回用户消息作为代码
    return {
      code: userMessage,
      language: 'javascript',
      enableDebug: false,
      timeout: 5000
    };
  }
  
  private normalizeLanguage(language: string): 'javascript' | 'python' | 'typescript' | 'sql' | 'shell' {
    const normalized = language.toLowerCase();
    switch (normalized) {
      case 'js':
      case 'javascript':
        return 'javascript';
      case 'ts':
      case 'typescript':
        return 'typescript';
      case 'py':
      case 'python':
        return 'python';
      case 'sql':
      case 'mysql':
      case 'postgresql':
        return 'sql';
      case 'bash':
      case 'sh':
      case 'shell':
        return 'shell';
      default:
        return 'javascript';
    }
  }
  
  private async generateGenericToolInput(userMessage: string, tool: Tool): Promise<Record<string, unknown>> {
    const prompt = this.language === 'zh' ?
      `用户请求："${userMessage}"
      
需要使用工具：${tool.name} - ${tool.description}

请根据用户请求和工具功能，生成合适的工具输入参数。
工具参数应该包含完成用户请求所需的所有信息。
请以JSON格式回复，只返回参数对象，不要包含任何解释。

例如：
{"param1": "value1", "param2": "value2"}` :
      `User Request: "${userMessage}"
      
Tool to use: ${tool.name} - ${tool.description}

Please generate appropriate tool input parameters based on the user request and tool functionality.
Tool parameters should contain all information needed to complete the user request.
Reply in JSON format only, return parameter object without any explanation.

Example:
{"param1": "value1", "param2": "value2"}`;
    
    try {
      const taskParams = this.getTaskParams('summary');
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        ...taskParams,
      });
      
      const result = response.choices[0]?.message?.content || '{}';
      let cleanResult = result.replace(/```json\n?|\n?```/g, '');
      const firstBrace = cleanResult.indexOf('{');
      const lastBrace = cleanResult.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1) {
        cleanResult = cleanResult.substring(firstBrace, lastBrace + 1);
      }
      
      return JSON.parse(cleanResult);
    } catch {
      // 返回默认输入
      return { query: userMessage };
    }
  }
}

// 通用分析师智能体
export class AnalystAgent extends BaseAgent {
  getName(): string {
    return this.language === 'zh' ? '分析师' : 'Analyst';
  }
  
  getRole(): string {
    return this.language === 'zh' ? '需求分析专家' : 'Requirements Analysis Expert';
  }
  
  getExpertise(): string[] {
    return this.language === 'zh' ? 
      ['需求分析', '问题诊断', '解决方案设计', '风险评估'] :
      ['Requirements Analysis', 'Problem Diagnosis', 'Solution Design', 'Risk Assessment'];
  }
}

// 技术专家智能体
export class TechnicalAgent extends BaseAgent {
  getName(): string {
    return this.language === 'zh' ? '技术专家' : 'Technical Expert';
  }
  
  getRole(): string {
    return this.language === 'zh' ? '技术实现专家' : 'Technical Implementation Expert';
  }
  
  getExpertise(): string[] {
    return this.language === 'zh' ? 
      ['代码开发', '系统架构', '技术选型', '性能优化'] :
      ['Code Development', 'System Architecture', 'Technology Selection', 'Performance Optimization'];
  }
}

// 项目经理智能体
export class ProjectManagerAgent extends BaseAgent {
  getName(): string {
    return this.language === 'zh' ? '项目经理' : 'Project Manager';
  }
  
  getRole(): string {
    return this.language === 'zh' ? '项目管理专家' : 'Project Management Expert';
  }
  
  getExpertise(): string[] {
    return this.language === 'zh' ? 
      ['项目规划', '资源协调', '进度管理', '质量控制'] :
      ['Project Planning', 'Resource Coordination', 'Progress Management', 'Quality Control'];
  }
}

// 智能体工厂
export class AgentFactory {
  static createAgent(type: 'analyst' | 'technical' | 'manager', openai: OpenAI, model: string, language: string): BaseAgent {
    switch (type) {
      case 'analyst':
        return new AnalystAgent(openai, model, language);
      case 'technical':
        return new TechnicalAgent(openai, model, language);
      case 'manager':
        return new ProjectManagerAgent(openai, model, language);
      default:
        return new AnalystAgent(openai, model, language);
    }
  }
  
  static createMultiAgent(userMessage: string, openai: OpenAI, model: string, language: string): BaseAgent[] {
    const agents: BaseAgent[] = [];
    const message = userMessage.toLowerCase();
    
    // 总是包含分析师
    agents.push(new AnalystAgent(openai, model, language));
    
    // 根据请求内容决定其他智能体
    if (message.includes('代码') || message.includes('技术') || message.includes('开发') || message.includes('程序')) {
      agents.push(new TechnicalAgent(openai, model, language));
    }
    
    if (message.includes('项目') || message.includes('管理') || message.includes('计划') || message.includes('协调')) {
      agents.push(new ProjectManagerAgent(openai, model, language));
    }
    
    // 如果只有分析师，再添加一个技术专家保证多样性
    if (agents.length === 1) {
      agents.push(new TechnicalAgent(openai, model, language));
    }
    
    return agents;
  }
}
