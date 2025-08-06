import { getConfigManager } from '@/config/config-manager';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const configManager = getConfigManager();
    const allModels = configManager.getAllModels();
    
    if (!allModels || allModels.length === 0) {
      return NextResponse.json(
        { error: 'No models configured' },
        { status: 500 }
      );
    }

    // Transform models for API response
    const models = allModels.map(model => ({
      id: model.model,
      name: model.title || model.name || model.model,
      provider: model.provider,
      roles: model.roles || []
    }));

    // Get default chat model
    const defaultChatModel = configManager.getDefaultModel('chat');

    return NextResponse.json({
      models,
      currentModel: defaultChatModel || models[0]?.id,
    });
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { model } = await request.json();

    if (!model) {
      return NextResponse.json(
        { error: 'Model is required' },
        { status: 400 }
      );
    }

    // Validate that the model exists in configuration
    const configManager = getConfigManager();
    const modelConfig = configManager.getModelConfig(model);
    
    if (!modelConfig) {
      return NextResponse.json(
        { error: 'Invalid model selection' },
        { status: 400 }
      );
    }

    // Return success - model selection is handled by the config system
    return NextResponse.json({
      success: true,
      selectedModel: model,
    });
  } catch (error) {
    console.error('Error updating model:', error);
    return NextResponse.json(
      { error: 'Failed to update model' },
      { status: 500 }
    );
  }
}