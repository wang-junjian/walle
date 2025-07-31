import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get model list from environment variable
    const modelListEnv = process.env.MODEL_LIST;
    const currentModel = process.env.OPENAI_MODEL;

    if (!modelListEnv) {
      return NextResponse.json(
        { error: 'MODEL_LIST not configured' },
        { status: 500 }
      );
    }

    // Parse the comma-separated model list
    const models = modelListEnv.split(',').map(model => model.trim());

    return NextResponse.json({
      models,
      currentModel: currentModel || models[0], // Default to first model if not specified
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

    // Validate that the model is in the allowed list
    const modelListEnv = process.env.MODEL_LIST;
    if (!modelListEnv) {
      return NextResponse.json(
        { error: 'MODEL_LIST not configured' },
        { status: 500 }
      );
    }

    const allowedModels = modelListEnv.split(',').map(m => m.trim());
    if (!allowedModels.includes(model)) {
      return NextResponse.json(
        { error: 'Invalid model selection' },
        { status: 400 }
      );
    }

    // In a real application, you might want to store this in a database
    // or session storage. For now, we'll just return success.
    // The actual model switching will be handled in the chat API.
    
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