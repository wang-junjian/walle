import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

interface ContinueConfig {
  models: Array<{
    model: string;
    title?: string;
    name?: string;
    provider: string;
    apiBase?: string;
    apiKey?: string;
    contextLength?: number;
    maxTokens?: number;
    temperature?: number;
    roles?: string[];
    isReasoningModel?: boolean;
    reasoningConfig?: {
      enableThinking?: boolean;
      thinkingBudget?: number;
    };
    contextLimitOverride?: number;
  }>;
  speechToTextProvider?: {
    model: string;
    apiBase?: string;
    apiKey?: string;
  };
  textToSpeechProvider?: {
    model: string;
    apiBase?: string;
    apiKey?: string;
    voice?: string;
  };
  searchProvider?: {
    provider: 'serper' | 'google' | 'bing';
    apiKey: string;
    apiBase?: string;
    maxResults?: number;
    language?: string;
    location?: string;
  };
  contextProviders?: Array<{
    name: string;
    params: Record<string, unknown>;
  }>;
  slashCommands?: Array<{
    name: string;
    description: string;
  }>;
  customCommands?: Array<{
    name: string;
    prompt: string;
    description: string;
  }>;
  experimental?: Record<string, boolean>;
  debug?: {
    enabled?: boolean;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    logModelCalls?: boolean;
    logApiRequests?: boolean;
    logToolExecutions?: boolean;
    outputToFile?: boolean;
    logFilePath?: string;
  };
}

class ConfigManager {
  private config: ContinueConfig | null = null;
  private configPath: string;

  constructor() {
    this.configPath = path.join(process.cwd(), 'config.yaml');
  }

  getConfig(): ContinueConfig {
    if (!this.config) {
      this.loadConfig();
    }
    return this.config!;
  }

  private loadConfig(): void {
    try {
      if (!fs.existsSync(this.configPath)) {
        throw new Error(`Configuration file not found: ${this.configPath}`);
      }

      const content = fs.readFileSync(this.configPath, 'utf8');
      this.config = yaml.load(content) as ContinueConfig;
      
      if (!this.config || !this.config.models) {
        throw new Error('Invalid configuration format');
      }
    } catch (error) {
      console.error('Failed to load configuration:', error);
      throw error;
    }
  }

  getAllModels() {
    return this.getConfig().models || [];
  }

  getChatModels() {
    return this.getAllModels().filter(model => 
      model.roles?.includes('chat') || !model.roles
    );
  }

  getModelsByRole(role: string) {
    return this.getAllModels().filter(model => 
      model.roles?.includes(role)
    );
  }

  getReasoningModels() {
    return this.getAllModels().filter(model => model.isReasoningModel);
  }

  isReasoningModel(modelName: string) {
    const model = this.getModelConfig(modelName);
    return model?.isReasoningModel || false;
  }

  getReasoningConfig(modelName: string) {
    const model = this.getModelConfig(modelName);
    return model?.reasoningConfig || {
      enableThinking: false,
      thinkingBudget: 4096
    };
  }

  getActualContextLimit(modelName: string) {
    const model = this.getModelConfig(modelName);
    // 如果有覆盖值，使用覆盖值；否则使用配置的 contextLength；最后使用默认值
    return model?.contextLimitOverride || model?.contextLength || 4096;
  }

  getDefaultModel(role: string) {
    const models = this.getModelsByRole(role);
    return models.length > 0 ? models[0].model : null;
  }

  getModelConfig(modelName: string) {
    return this.getAllModels().find(model => model.model === modelName);
  }

  getSpeechConfig() {
    const config = this.getConfig();
    return {
      speechToText: config.speechToTextProvider,
      textToSpeech: config.textToSpeechProvider
    };
  }

  getSearchConfig() {
    const config = this.getConfig();
    return config.searchProvider || {
      provider: 'serper',
      apiKey: '',
      apiBase: 'https://google.serper.dev/search',
      maxResults: 10,
      language: 'zh',
      location: 'china'
    };
  }

  getDebugConfig() {
    const config = this.getConfig();
    return config.debug || {
      enabled: false,
      logLevel: 'info',
      logModelCalls: false,
      logApiRequests: false,
      logToolExecutions: false,
      outputToFile: false,
      logFilePath: './debug.log'
    };
  }
}

// 单例实例
let configManagerInstance: ConfigManager | null = null;

export function getConfigManager(): ConfigManager {
  if (!configManagerInstance) {
    configManagerInstance = new ConfigManager();
  }
  return configManagerInstance;
}

// 便捷函数
export function getAllModels() {
  return getConfigManager().getAllModels();
}

export function getChatModels() {
  return getConfigManager().getChatModels();
}

export function getModelsByRole(role: string) {
  return getConfigManager().getModelsByRole(role);
}

export function getDefaultModel(role: string) {
  return getConfigManager().getDefaultModel(role);
}

export function getModelConfig(modelName: string) {
  return getConfigManager().getModelConfig(modelName);
}

export function getSpeechConfig() {
  return getConfigManager().getSpeechConfig();
}

export function getSearchConfig() {
  return getConfigManager().getSearchConfig();
}

export function getDebugConfig() {
  return getConfigManager().getDebugConfig();
}

export function getReasoningModels() {
  return getConfigManager().getReasoningModels();
}

export function isReasoningModel(modelName: string) {
  return getConfigManager().isReasoningModel(modelName);
}

export function getReasoningConfig(modelName: string) {
  return getConfigManager().getReasoningConfig(modelName);
}

export function getActualContextLimit(modelName: string) {
  return getConfigManager().getActualContextLimit(modelName);
}
