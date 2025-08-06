import { AgentFactory } from '@/utils/modern-agent-system';
import { getConfigManager } from '@/config/config-manager';
import { AgentThought } from '@/types/chat';
import OpenAI from 'openai';

// Initialize OpenAI client
const initializeOpenAI = (modelConfig?: { apiKey?: string; apiBase?: string } | null) => {
  const configManager = getConfigManager();
  
  if (modelConfig && modelConfig.apiKey && modelConfig.apiBase) {
    return new OpenAI({
      apiKey: modelConfig.apiKey,
      baseURL: modelConfig.apiBase,
    });
  }
  
  const models = configManager.getAllModels();
  if (models.length > 0) {
    const firstModel = models[0];
    if (firstModel.apiKey && firstModel.apiBase) {
      return new OpenAI({
        apiKey: firstModel.apiKey,
        baseURL: firstModel.apiBase,
      });
    }
  }
  
  throw new Error('No valid API configuration found');
};

export async function GET() {
  console.log('智能体测试端点被调用');
  
  const configManager = getConfigManager();
  const allModels = configManager.getAllModels();
  const modelConfig = allModels.length > 0 ? allModels[0] : null;
  const openai = initializeOpenAI(modelConfig);
  
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 测试参数
        const message = "请简单分析一下人工智能的发展趋势";
        const model = "gpt-4o-mini";
        const language = "zh";
        
        console.log('开始测试智能体思考流程');
        
        // 创建智能体
        const agent = AgentFactory.createAgent('analyst', openai, model, language);
        
        // 流式更新回调函数
        const onThoughtUpdate = (thought: AgentThought) => {
          console.log('发送智能体思考更新:', {
            id: thought.id,
            type: thought.type,
            status: thought.status,
            contentLength: thought.content?.length || 0,
            contentPreview: thought.content?.substring(0, 50) || '无内容'
          });
          
          const eventData = JSON.stringify({
            type: 'agent_thought_update',
            agent_thought: thought
          });
          
          controller.enqueue(encoder.encode(`data: ${eventData}\n\n`));
        };
        
        // 执行观察阶段
        console.log('开始观察阶段');
        const observationThought = await agent.observeStream(message, undefined, onThoughtUpdate);
        console.log('观察阶段完成:', observationThought.id);
        
        // 执行思考阶段
        console.log('开始思考阶段');
        const thinkingThought = await agent.thinkStream(observationThought.content, message, onThoughtUpdate);
        console.log('思考阶段完成:', thinkingThought.id);
        
        // 发送完成消息
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'complete',
          message: '智能体测试完成'
        })}\n\n`));
        
        controller.close();
        
      } catch (error) {
        console.error('智能体测试错误:', error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })}\n\n`));
        controller.close();
      }
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
