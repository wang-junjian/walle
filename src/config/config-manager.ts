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
