import { NextRequest, NextResponse } from 'next/server';
import { getConfigManager } from '@/config/config-manager';
import { debugLogger } from '@/utils/debug-logger';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export async function GET(_request: NextRequest) {
  try {
    debugLogger.info('DEBUG_CONFIG_API', 'Getting debug configuration');
    
    const configManager = getConfigManager();
    const debugConfig = configManager.getDebugConfig();
    
    return NextResponse.json({
      success: true,
      data: debugConfig
    });
  } catch (error) {
    debugLogger.error('DEBUG_CONFIG_API', 'Failed to get debug configuration', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get debug configuration' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    debugLogger.info('DEBUG_CONFIG_API', 'Updating debug configuration');
    
    const body = await request.json();
    const { debugConfig } = body;
    
    if (!debugConfig || typeof debugConfig !== 'object') {
      return NextResponse.json(
        { error: 'Invalid debug configuration provided' },
        { status: 400 }
      );
    }
    
    // Read current config
    const configPath = path.join(process.cwd(), 'config.yaml');
    
    if (!fs.existsSync(configPath)) {
      return NextResponse.json(
        { error: 'Configuration file not found' },
        { status: 404 }
      );
    }
    
    const content = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(content) as Record<string, unknown>;
    
    // Update debug configuration
    config.debug = {
      ...(config.debug as Record<string, unknown> || {}),
      ...debugConfig
    };
    
    // Write back to file
    const updatedContent = yaml.dump(config);
    fs.writeFileSync(configPath, updatedContent, 'utf8');
    
    debugLogger.info('DEBUG_CONFIG_API', 'Debug configuration updated successfully', {
      newConfig: debugConfig
    });
    
    return NextResponse.json({
      success: true,
      message: 'Debug configuration updated successfully'
    });
  } catch (error) {
    debugLogger.error('DEBUG_CONFIG_API', 'Failed to update debug configuration', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update debug configuration' 
      },
      { status: 500 }
    );
  }
}
