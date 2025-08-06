import { NextResponse } from 'next/server';
import { getConfigManager } from '@/config/config-manager';

export async function GET() {
  try {
    const configManager = getConfigManager();
    
    // 获取所有聊天模型
    const chatModels = configManager.getChatModels();
    const currentModel = configManager.getDefaultModel('chat');

    // 格式化模型列表
    const models = chatModels.map(model => ({
      id: model.model,
      name: model.name || model.title,
      provider: model.provider,
      capabilities: model.roles, // 使用 roles 替代 capabilities
      contextLength: model.contextLength,
      maxTokens: model.maxTokens,
    }));

    return NextResponse.json({
      models: models.map(m => m.id),
      modelDetails: models,
      currentModel: currentModel || (models.length > 0 ? models[0].id : undefined),
      // Continue.dev 配置格式没有这些字段，使用默认值
      defaultModels: {},
      providers: ['openai'], // 基于配置中的模型提供商
    });
  } catch (error) {
    console.error('Error fetching models from config:', error);
    
    // 回退到环境变量
    try {
      const modelListEnv = process.env.MODEL_LIST;
      const currentModel = process.env.OPENAI_MODEL;

      if (!modelListEnv) {
        return NextResponse.json(
          { error: 'Neither config.yaml nor MODEL_LIST environment variable is configured' },
          { status: 500 }
        );
      }

      const models = modelListEnv.split(',').map(model => model.trim());

      return NextResponse.json({
        models,
        currentModel: currentModel || models[0],
        source: 'environment',
      });
    } catch (envError) {
      console.error('Error fetching models from environment:', envError);
      return NextResponse.json(
        { error: 'Failed to fetch models from both config and environment' },
        { status: 500 }
      );
    }
  }
}

export async function POST(request: Request) {
  try {
    const { model, capability } = await request.json();

    if (!model) {
      return NextResponse.json(
        { error: 'Model is required' },
        { status: 400 }
      );
    }

    const configManager = getConfigManager();
    
    // 验证模型是否存在
    const modelConfig = configManager.getModelConfig(model);
    if (!modelConfig) {
      return NextResponse.json(
        { error: 'Invalid model' },
        { status: 400 }
      );
    }

    // 如果指定了能力，验证模型是否支持该能力
    if (capability && modelConfig.roles && !modelConfig.roles.includes(capability)) {
      return NextResponse.json(
        { error: `Model ${model} does not support capability: ${capability}` },
        { status: 400 }
      );
    }

    // 在实际应用中，您可能需要将选择存储在数据库或会话中
    // 现在我们只返回成功响应
    
    return NextResponse.json({
      success: true,
      selectedModel: model,
      modelConfig: {
        name: modelConfig.name || modelConfig.title,
        provider: modelConfig.provider,
        capabilities: modelConfig.roles, // 使用 roles 替代 capabilities
        contextLength: modelConfig.contextLength,
        maxTokens: modelConfig.maxTokens,
      },
    });
  } catch (error) {
    console.error('Error updating model:', error);
    return NextResponse.json(
      { error: 'Failed to update model' },
      { status: 500 }
    );
  }
}
