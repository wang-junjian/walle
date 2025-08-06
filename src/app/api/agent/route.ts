import { getConfigManager } from '@/config/config-manager';
import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { AgentThought, SubAgent } from '@/types/chat';
import { AgentFactory } from '@/utils/modern-agent-system';
import { selectToolsForTask } from '@/utils/agent-tools';

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

// Single agent processing
const processSingleAgent = async (
  message: string,
  openai: OpenAI,
  model: string,
  language: string,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder
) => {
  const agent = AgentFactory.createAgent('analyst', openai, model, language);
  const allThoughts: AgentThought[] = [];
  
  // 流式更新回调函数
  const onThoughtUpdate = (thought: AgentThought) => {
    console.log('发送 agent_thought_update:', {
      id: thought.id,
      type: thought.type,
      status: thought.status,
      contentLength: thought.content?.length || 0,
      contentPreview: thought.content?.substring(0, 50) || '无内容'
    });
    
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
      type: 'agent_thought_update',
      agent_thought: thought
    })}\n\n`));
  };
  
  // Observation phase with streaming
  const observationThought = await agent.observeStream(message, undefined, onThoughtUpdate);
  allThoughts.push(observationThought);

  // Thinking phase with streaming
  const thinkingThought = await agent.thinkStream(observationThought.content, message, onThoughtUpdate);
  allThoughts.push(thinkingThought);

  // Action phase with streaming
  const tools = selectToolsForTask(message);
  if (tools.length > 0) {
    const actionThought = await agent.executeActionStream(message, tools[0].name, onThoughtUpdate);
    allThoughts.push(actionThought);
  }

  // Reflection phase with streaming
  await agent.reflectStream(allThoughts, thinkingThought.content, onThoughtUpdate);
};

// Multi-agent processing
const processMultiAgent = async (
  message: string,
  openai: OpenAI,
  model: string,
  language: string,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder
) => {
  const agents = [
    AgentFactory.createAgent('analyst', openai, model, language),
    AgentFactory.createAgent('technical', openai, model, language),
    AgentFactory.createAgent('manager', openai, model, language)
  ];

  // Create sub-agents for tracking
  const subAgents: SubAgent[] = agents.map((agent, index) => ({
    id: `agent-${Date.now()}-${index}`,
    name: agent.getName(),
    role: agent.getRole(),
    status: 'thinking',
    expertise: agent.getExpertise(),
    progress: 0
  }));

  // Collaboration thought
  const collaborationThought: AgentThought = {
    id: `collaboration-${Date.now()}`,
    type: 'collaboration',
    title: language.startsWith('zh') ? '多智能体协作' : 'Multi-Agent Collaboration',
    content: language.startsWith('zh') ? '启动多智能体协作模式...' : 'Initiating multi-agent collaboration...',
    timestamp: new Date(),
    status: 'running',
    collaborator: 'Multi-Agent System'
  };

  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
    type: 'agent_thought',
    agent_thought: collaborationThought
  })}\n\n`));

  const allThoughts: AgentThought[] = [];
  
  // 流式更新回调函数
  const onThoughtUpdate = (thought: AgentThought) => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
      type: 'agent_thought_update',
      agent_thought: thought
    })}\n\n`));
  };

  // Process each agent with streaming
  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    const subAgent = subAgents[i];
    
    subAgent.status = 'working';
    subAgent.progress = 20;
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
      type: 'sub_agent',
      sub_agent: subAgent
    })}\n\n`));

    // Each agent performs observation, thinking, action, reflection with streaming
    const observationThought = await agent.observeStream(message, undefined, onThoughtUpdate);
    allThoughts.push(observationThought);
    subAgent.progress = 40;
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
      type: 'sub_agent_update',
      sub_agent_id: subAgent.id,
      progress: 40
    })}\n\n`));

    const thinkingThought = await agent.thinkStream(observationThought.content, message, onThoughtUpdate);
    allThoughts.push(thinkingThought);
    subAgent.progress = 70;
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
      type: 'sub_agent_update',
      sub_agent_id: subAgent.id,
      progress: 70
    })}\n\n`));

    const tools = selectToolsForTask(message);
    if (tools.length > 0) {
      const actionThought = await agent.executeActionStream(message, tools[0].name, onThoughtUpdate);
      allThoughts.push(actionThought);
    }

    subAgent.progress = 90;
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
      type: 'sub_agent_update',
      sub_agent_id: subAgent.id,
      progress: 90
    })}\n\n`));

    // Quick reflection for multi-agent scenario
    const reflectionThought = await agent.reflectStream([observationThought, thinkingThought], thinkingThought.content, onThoughtUpdate);
    allThoughts.push(reflectionThought);

    subAgent.status = 'completed';
    subAgent.progress = 100;
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
      type: 'sub_agent_update',
      sub_agent_id: subAgent.id,
      status: 'completed',
      progress: 100
    })}\n\n`));
  }

  // Complete collaboration
  collaborationThought.status = 'completed';
  collaborationThought.content = language.startsWith('zh') ? 
    '多智能体协作完成，各专业角度分析已汇总' : 
    'Multi-agent collaboration completed, all perspectives analyzed';

  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
    type: 'agent_thought_update',
    agent_thought_id: collaborationThought.id,
    status: 'completed',
    content: collaborationThought.content
  })}\n\n`));
};

export async function POST(request: NextRequest) {
  console.log('智能体 API 端点被调用');
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        console.log('开始处理智能体请求');
        const formData = await request.formData();
        const message = formData.get('message') as string;
        const imageFile = formData.get('image') as File | null;
        const conversationHistory = formData.get('history') as string;
        const selectedModel = formData.get('model') as string;
        const language = formData.get('language') as string || 'zh';

        if (!message && !imageFile) {
          throw new Error('Either message or image is required');
        }

        const configManager = getConfigManager();
        const allModels = configManager.getAllModels();
        
        let modelToUse = 'GLM-4.5-Flash';
        let modelConfig = null;
        
        if (selectedModel) {
          const selectedModelConfig = allModels.find(m => m.model === selectedModel);
          if (selectedModelConfig) {
            modelToUse = selectedModel;
            modelConfig = selectedModelConfig;
          }
        } else if (allModels.length > 0) {
          modelToUse = allModels[0].model;
          modelConfig = allModels[0];
        }

        const openai = initializeOpenAI(modelConfig);

        // Determine if we need multi-agent processing
        const isComplexTask = message.length > 100 || 
                             message.toLowerCase().includes('analyze') ||
                             message.toLowerCase().includes('compare') ||
                             message.toLowerCase().includes('分析') ||
                             message.toLowerCase().includes('比较');

        if (isComplexTask) {
          await processMultiAgent(message, openai, modelToUse, language, controller, encoder);
        } else {
          await processSingleAgent(message, openai, modelToUse, language, controller, encoder);
        }

        // Generate final response
        const history = conversationHistory ? JSON.parse(conversationHistory) : [];
        const messages = [
          ...history,
          { role: 'user', content: message }
        ];

        const finalResponse = await openai.chat.completions.create({
          model: modelToUse,
          messages,
          max_tokens: 2000,
          temperature: 0.7,
          stream: true,
        });

        for await (const chunk of finalResponse) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'content',
              content: content
            })}\n\n`));
          }
        }

        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();

      } catch (error) {
        console.error('Agent error:', error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error occurred'
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
