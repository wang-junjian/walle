import fs from 'fs';
import path from 'path';
import { getDebugConfig } from '@/config/config-manager';

interface LogEntry {
  timestamp: string;
  level: string;
  category: string;
  message: string;
  data?: Record<string, unknown>;
}

class DebugLogger {
  private config: ReturnType<typeof getDebugConfig>;
  private initialized = false;

  constructor() {
    this.config = getDebugConfig();
  }

  private init() {
    if (!this.initialized) {
      this.config = getDebugConfig();
      this.initialized = true;
    }
  }

  private shouldLog(level: string): boolean {
    this.init();
    
    if (!this.config.enabled) {
      return false;
    }

    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.logLevel || 'info');
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(level: string, category: string, message: string, data?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const logEntry: LogEntry = {
      timestamp,
      level: level.toUpperCase(),
      category,
      message,
      ...(data && { data })
    };

    return JSON.stringify(logEntry, null, 2);
  }

  private writeToFile(content: string) {
    if (this.config.outputToFile && this.config.logFilePath) {
      try {
        const logDir = path.dirname(this.config.logFilePath);
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
        
        fs.appendFileSync(this.config.logFilePath, content + '\n');
      } catch (error) {
        console.error('Failed to write to debug log file:', error);
      }
    }
  }

  private log(level: string, category: string, message: string, data?: Record<string, unknown>) {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(level, category, message, data);
    
    // Always output to console if debug is enabled
    console.log(`[DEBUG] ${formattedMessage}`);
    
    // Optionally write to file
    this.writeToFile(formattedMessage);
  }

  // Model call logging
  logModelCall(modelName: string, input: Record<string, unknown>, output?: Record<string, unknown>, error?: Error) {
    this.init();
    
    if (!this.config.logModelCalls) {
      return;
    }

    const data: Record<string, unknown> = {
      model: modelName,
      input: {
        ...input,
        // 避免记录敏感信息
        messages: Array.isArray(input.messages) ? 
          input.messages.map((msg: Record<string, unknown>) => ({
            role: msg.role,
            content: typeof msg.content === 'string' ? 
              msg.content.substring(0, 200) + (msg.content.length > 200 ? '...' : '') : 
              '[非文本内容]'
          })) : input.messages
      }
    };

    if (output) {
      data.output = {
        ...output,
        // 限制输出内容长度
        content: typeof output.content === 'string' ? 
          output.content.substring(0, 500) + (output.content.length > 500 ? '...' : '') : 
          output.content
      };
    }

    if (error) {
      data.error = {
        message: error.message,
        stack: error.stack
      };
    }

    this.log(error ? 'error' : 'info', 'MODEL_CALL', 
      `Model ${modelName} call ${error ? 'failed' : 'completed'}`, data);
  }

  // API request logging
  logApiRequest(endpoint: string, method: string, params: Record<string, unknown>, response?: Record<string, unknown>, error?: Error) {
    this.init();
    
    if (!this.config.logApiRequests) {
      return;
    }

    const data: Record<string, unknown> = {
      endpoint,
      method,
      params: {
        ...params,
        // 隐藏敏感参数
        apiKey: params.apiKey ? '[HIDDEN]' : undefined,
        message: typeof params.message === 'string' ? 
          params.message.substring(0, 200) + (params.message.length > 200 ? '...' : '') : 
          params.message
      }
    };

    if (response) {
      data.response = response;
    }

    if (error) {
      data.error = {
        message: error.message,
        stack: error.stack
      };
    }

    this.log(error ? 'error' : 'info', 'API_REQUEST', 
      `API ${method} ${endpoint} ${error ? 'failed' : 'completed'}`, data);
  }

  // Tool execution logging
  logToolExecution(toolName: string, input: Record<string, unknown>, output?: Record<string, unknown>, error?: Error) {
    this.init();
    
    if (!this.config.logToolExecutions) {
      return;
    }

    const data: Record<string, unknown> = {
      tool: toolName,
      input
    };

    if (output) {
      data.output = output;
    }

    if (error) {
      data.error = {
        message: error.message,
        stack: error.stack
      };
    }

    this.log(error ? 'error' : 'info', 'TOOL_EXECUTION', 
      `Tool ${toolName} ${error ? 'failed' : 'completed'}`, data);
  }

  // General logging methods
  debug(category: string, message: string, data?: Record<string, unknown>) {
    this.log('debug', category, message, data);
  }

  info(category: string, message: string, data?: Record<string, unknown>) {
    this.log('info', category, message, data);
  }

  warn(category: string, message: string, data?: Record<string, unknown>) {
    this.log('warn', category, message, data);
  }

  error(category: string, message: string, data?: Record<string, unknown>) {
    this.log('error', category, message, data);
  }

  // Performance logging
  logPerformance(operation: string, duration: number, additional?: Record<string, unknown>) {
    this.info('PERFORMANCE', `Operation ${operation} took ${duration}ms`, {
      operation,
      duration,
      ...additional
    });
  }

  // Stream logging
  logStreamEvent(eventType: string, data: Record<string, unknown>) {
    this.debug('STREAM', `Stream event: ${eventType}`, {
      eventType,
      ...data
    });
  }
}

// 单例实例
let debugLoggerInstance: DebugLogger | null = null;

export function getDebugLogger(): DebugLogger {
  if (!debugLoggerInstance) {
    debugLoggerInstance = new DebugLogger();
  }
  return debugLoggerInstance;
}

// 便捷函数
export const debugLogger = {
  logModelCall: (modelName: string, input: Record<string, unknown>, output?: Record<string, unknown>, error?: Error) => {
    getDebugLogger().logModelCall(modelName, input, output, error);
  },
  
  logApiRequest: (endpoint: string, method: string, params: Record<string, unknown>, response?: Record<string, unknown>, error?: Error) => {
    getDebugLogger().logApiRequest(endpoint, method, params, response, error);
  },
  
  logToolExecution: (toolName: string, input: Record<string, unknown>, output?: Record<string, unknown>, error?: Error) => {
    getDebugLogger().logToolExecution(toolName, input, output, error);
  },
  
  debug: (category: string, message: string, data?: Record<string, unknown>) => {
    getDebugLogger().debug(category, message, data);
  },
  
  info: (category: string, message: string, data?: Record<string, unknown>) => {
    getDebugLogger().info(category, message, data);
  },
  
  warn: (category: string, message: string, data?: Record<string, unknown>) => {
    getDebugLogger().warn(category, message, data);
  },
  
  error: (category: string, message: string, data?: Record<string, unknown>) => {
    getDebugLogger().error(category, message, data);
  },
  
  logPerformance: (operation: string, duration: number, additional?: Record<string, unknown>) => {
    getDebugLogger().logPerformance(operation, duration, additional);
  },
  
  logStreamEvent: (eventType: string, data: Record<string, unknown>) => {
    getDebugLogger().logStreamEvent(eventType, data);
  }
};
