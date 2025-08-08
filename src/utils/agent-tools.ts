// 智能体工具系统
import { debugLogger } from './debug-logger';

export interface Tool {
  name: string;
  description: string;
  execute: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

// 智能网络搜索工具
export const webSearchTool: Tool = {
  name: 'web_search',
  description: '智能网络搜索工具，支持多种搜索策略',
  execute: async (input: Record<string, unknown>) => {
    const startTime = Date.now();
    try {
      debugLogger.info('TOOL_EXECUTION', 'Starting web search', { input });
      
      const { query, searchType = 'general' } = input as { 
        query: string; 
        searchType?: 'general' | 'technical' | 'news' | 'academic';
      };
      
      // 导入真实工具实现
      const { REAL_TOOLS } = await import('./real-tools');
      const result = await REAL_TOOLS.web_search.execute({
        query,
        searchType,
        maxResults: 5,
        language: 'zh'
      });

      const endTime = Date.now();
      debugLogger.logToolExecution('web_search', input, result);
      debugLogger.logPerformance('web_search', endTime - startTime);
      
      return result;
    } catch (error) {
      const endTime = Date.now();
      debugLogger.logToolExecution('web_search', input, undefined, error as Error);
      debugLogger.logPerformance('web_search', endTime - startTime, { error: true });
      throw error;
    }
  }
};

// 代码执行工具
export const codeExecutionTool: Tool = {
  name: 'code_execution',
  description: '安全代码执行工具，支持多种编程语言',
  execute: async (input: Record<string, unknown>) => {
    const startTime = Date.now();
    try {
      debugLogger.info('TOOL_EXECUTION', 'Starting code execution', { 
        language: input.language,
        codeLength: typeof input.code === 'string' ? input.code.length : 0
      });
      
      const { code, language, enableDebug = false } = input as { 
        code: string; 
        language: 'javascript' | 'python' | 'typescript' | 'sql' | 'shell';
        enableDebug?: boolean;
      };
      
      // 导入真实工具实现
      const { REAL_TOOLS } = await import('./real-tools');
      const result = await REAL_TOOLS.code_execution.execute({
        code,
        language,
        enableDebug,
        timeout: 5000
      });

      const endTime = Date.now();
      debugLogger.logToolExecution('code_execution', input, result);
      debugLogger.logPerformance('code_execution', endTime - startTime);
      
      return result;
    } catch (error) {
      const endTime = Date.now();
      debugLogger.logToolExecution('code_execution', input, undefined, error as Error);
      debugLogger.logPerformance('code_execution', endTime - startTime, { error: true });
      throw error;
    }
  }
};

// 搜索工具
export const searchTool: Tool = {
  name: 'search',
  description: '搜索相关信息',
  execute: async (input: Record<string, unknown>) => {
    const { query, type } = input as { query: string; type: 'web' | 'knowledge' };
    
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    if (type === 'web') {
      return {
        results: [
          {
            title: `关于"${query}"的搜索结果1`,
            snippet: `这是关于${query}的相关信息摘要...`,
            url: 'https://example.com/1'
          },
          {
            title: `关于"${query}"的搜索结果2`,
            snippet: `更多关于${query}的详细信息...`,
            url: 'https://example.com/2'
          }
        ],
        total: 2
      };
    } else {
      return {
        knowledge: `基于知识库的回答：${query}是一个重要的概念，具有以下特点...`,
        confidence: 0.85
      };
    }
  }
};

// 计算工具
export const calculatorTool: Tool = {
  name: 'calculator',
  description: '执行数学计算',
  execute: async (input: Record<string, unknown>) => {
    const { expression } = input as { expression: string };
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      const sanitized = expression.replace(/[^0-9+\-*/.() ]/g, '');
      // Using Function constructor for safe evaluation of mathematical expressions
      const result = Function(`"use strict"; return (${sanitized})`)();
      
      return {
        expression: expression,
        result: result,
        success: true
      };
    } catch {
      return {
        expression: expression,
        error: '无法计算该表达式',
        success: false
      };
    }
  }
};

// 代码分析工具
export const codeAnalysisTool: Tool = {
  name: 'code_analysis',
  description: '分析代码质量和问题',
  execute: async (input: Record<string, unknown>) => {
    const { code, language } = input as { code: string; language: string };
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const issues = [];
    const suggestions = [];
    
    if (code.includes('console.log')) {
      issues.push('发现调试语句，建议在生产环境中移除');
    }
    
    if (code.length > 1000) {
      issues.push('代码过长，建议拆分为更小的函数');
    }
    
    if (!code.includes('//') && !code.includes('/*')) {
      suggestions.push('建议添加注释以提高代码可读性');
    }
    
    if (language === 'javascript' && !code.includes('use strict')) {
      suggestions.push('建议使用严格模式');
    }
    
    const lines = code.split('\n').length;
    const complexity = lines > 50 ? '高' : lines > 20 ? '中' : '低';
    const score = Math.max(10 - issues.length * 2, 1);
    
    return {
      language: language,
      lines: lines,
      issues: issues,
      suggestions: suggestions,
      complexity: complexity,
      score: score
    };
  }
};

// 文件操作工具
export const fileOperationTool: Tool = {
  name: 'file_operation',
  description: '文件和目录操作',
  execute: async (input: Record<string, unknown>) => {
    const { operation, path, content } = input as { operation: string; path: string; content?: string };
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    switch (operation) {
      case 'read':
        return {
          path: path,
          content: `模拟读取的文件内容: ${path}`,
          size: Math.floor(Math.random() * 10000),
          success: true
        };
      
      case 'write':
        return {
          path: path,
          written: content?.length || 0,
          success: true
        };
      
      case 'list':
        return {
          path: path,
          items: ['file1.txt', 'file2.js', 'folder1/'],
          success: true
        };
      
      case 'create':
        return {
          path: path,
          created: true,
          success: true
        };
      
      default:
        return {
          error: `不支持的操作: ${operation}`,
          success: false
        };
    }
  }
};

// 数据分析工具
export const dataAnalysisTool: Tool = {
  name: 'data_analysis',
  description: '分析数据集',
  execute: async (input: Record<string, unknown>) => {
    const { data, analysis_type } = input as { data: number[]; analysis_type: string };
    
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    if (analysis_type === 'statistics') {
      const sum = data.reduce((a, b) => a + b, 0);
      const mean = sum / data.length;
      const sortedData = [...data].sort((a, b) => a - b);
      const median = sortedData[Math.floor(sortedData.length / 2)];
      const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / data.length;
      const std = Math.sqrt(variance);
      
      return {
        count: data.length,
        sum: sum,
        mean: mean.toFixed(2),
        median: median,
        min: Math.min(...data),
        max: Math.max(...data),
        std: std.toFixed(2)
      };
    } else {
      return {
        type: analysis_type,
        result: '分析完成',
        data_points: data.length
      };
    }
  }
};

// 所有可用工具
export const AVAILABLE_TOOLS: Record<string, Tool> = {
  web_search: webSearchTool,
  code_execution: codeExecutionTool,
  search: searchTool,
  calculator: calculatorTool,
  code_analysis: codeAnalysisTool,
  file_operation: fileOperationTool,
  data_analysis: dataAnalysisTool
};

// 智能工具选择：使用决策引擎而不是关键字匹配
export async function selectToolsForTask(message: string): Promise<Tool[]> {
  try {
    // 使用智能决策引擎
    const { getDecisionEngine } = await import('./intelligent-decision-engine');
    const decisionEngine = getDecisionEngine();
    
    const decision = await decisionEngine.analyzeUserRequest(message);
    
    // 根据决策结果选择工具
    const tools: Tool[] = [];
    
    for (const toolName of decision.toolsRequired) {
      switch (toolName) {
        case 'web_search':
          tools.push(webSearchTool);
          break;
        case 'code_execution':
          tools.push(codeExecutionTool);
          break;
        case 'calculator':
          tools.push(calculatorTool);
          break;
        case 'code_analysis':
          tools.push(codeAnalysisTool);
          break;
        case 'file_operation':
          tools.push(fileOperationTool);
          break;
        case 'data_analysis':
          tools.push(dataAnalysisTool);
          break;
      }
    }
    
    console.log(`智能决策结果: ${decision.reasoning}, 工具: [${decision.toolsRequired.join(', ')}]`);
    return tools;
    
  } catch (error) {
    console.error('智能工具选择失败，使用简化逻辑:', error);
    return fallbackToolSelection(message);
  }
}

// 简化的后备工具选择
function fallbackToolSelection(message: string): Tool[] {
  // 数学计算
  if (/[\d+\-*/()=]/.test(message) && (message.includes('计算') || /^\s*[\d\s+\-*/().=]+\s*$/.test(message))) {
    return [codeExecutionTool];
  }
  
  // 明确的搜索请求
  if (message.includes('搜索') || message.includes('最新') || message.includes('查找')) {
    return [webSearchTool];
  }
  
  // 编程相关
  if (message.includes('代码') || message.includes('编程') || message.includes('函数')) {
    return [codeExecutionTool];
  }
  
  return [];
}