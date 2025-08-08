import { getConfigManager } from '@/config/config-manager';
import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { AgentThought, SubAgent } from '@/types/chat';
import { AgentFactory } from '@/utils/modern-agent-system';
import { debugLogger } from '@/utils/debug-logger';

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
  encoder: TextEncoder,
  enableCodeExecution: boolean = false
) => {
  const agent = AgentFactory.createAgent('analyst', openai, model, language);
  const allThoughts: AgentThought[] = [];
  const allToolResults: Array<{ toolName: string; input: Record<string, unknown>; output: Record<string, unknown> }> = [];
  
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

  // 如果启用代码执行，先使用模型判断是否需要执行代码
  let needsCodeExecution = false;
  if (enableCodeExecution) {
    try {
      // 使用智能决策引擎判断
      const { getDecisionEngine } = await import('@/utils/intelligent-decision-engine');
      const decisionEngine = getDecisionEngine();
      const decision = await decisionEngine.analyzeUserRequest(message);
      needsCodeExecution = decision.toolsRequired.includes('code_execution');
      
      if (needsCodeExecution) {
        console.log('模型判断需要代码执行，准备生成和执行代码');
        
        // 创建代码执行思考
        const codeExecutionThought: AgentThought = {
          id: `code-execution-${Date.now()}`,
          type: 'action',
          title: language.startsWith('zh') ? '代码执行' : 'Code Execution',
          content: language.startsWith('zh') ? '准备生成代码解决问题...' : 'Preparing to generate code to solve the problem...',
          timestamp: new Date(),
          status: 'running',
          tool_name: 'code_execution'
        };
        
        // 发送思考更新
        onThoughtUpdate(codeExecutionThought);
        
        // 执行代码生成和执行
        const actionThought = await agent.executeActionStream(message, 'code_execution', onThoughtUpdate);
        allThoughts.push(actionThought);
        
        // 收集工具执行结果
        if (actionThought.tool_output) {
          allToolResults.push({
            toolName: 'code_execution',
            input: actionThought.tool_input || {},
            output: actionThought.tool_output
          });
        }
      } else {
        console.log('模型判断无需代码执行，直接进行反思阶段');
      }
    } catch (error) {
      console.error('代码执行判断失败:', error);
      // 失败时不执行代码，继续正常流程
    }
  }

  // Reflection phase with streaming
  const reflectionThought = await agent.reflectStream(allThoughts, thinkingThought.content, onThoughtUpdate);
  allThoughts.push(reflectionThought);
  
  // 返回智能体的思考结果和工具输出，供最终回答使用
  return {
    thoughts: allThoughts,
    toolResults: allToolResults,
    agentAnalysis: reflectionThought.content,
    codeExecuted: needsCodeExecution
  };
};

// Multi-agent processing
const processMultiAgent = async (
  message: string,
  openai: OpenAI,
  model: string,
  language: string,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  enableCodeExecution: boolean = false
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
  const allToolResults: Array<{ toolName: string; input: Record<string, unknown>; output: Record<string, unknown>; agentName: string }> = [];
  
  // 流式更新回调函数
  const onThoughtUpdate = (thought: AgentThought) => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
      type: 'agent_thought_update',
      agent_thought: thought
    })}\n\n`));
  };

  // 先判断是否需要代码执行
  let needsCodeExecution = false;
  if (enableCodeExecution) {
    try {
      const { getDecisionEngine } = await import('@/utils/intelligent-decision-engine');
      const decisionEngine = getDecisionEngine();
      const decision = await decisionEngine.analyzeUserRequest(message);
      needsCodeExecution = decision.toolsRequired.includes('code_execution');
    } catch (error) {
      console.error('代码执行判断失败:', error);
    }
  }

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

    // 只对第一个智能体执行代码，避免重复执行
    if (needsCodeExecution && i === 0) {
      const actionThought = await agent.executeActionStream(message, 'code_execution', onThoughtUpdate);
      allThoughts.push(actionThought);
      
      // 收集工具执行结果
      if (actionThought.tool_output) {
        allToolResults.push({
          toolName: 'code_execution',
          input: actionThought.tool_input || {},
          output: actionThought.tool_output,
          agentName: agent.getName()
        });
      }
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
  
  // 返回多智能体的思考结果和工具输出
  return {
    thoughts: allThoughts,
    toolResults: allToolResults,
    collaborationSummary: collaborationThought.content,
    codeExecuted: needsCodeExecution
  };
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  debugLogger.info('AGENT_API', 'Agent API request started');
  
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        debugLogger.debug('AGENT_API', 'Processing agent request');
        const formData = await request.formData();
        const message = formData.get('message') as string;
        const imageFile = formData.get('image') as File | null;
        const conversationHistory = formData.get('history') as string;
        const selectedModel = formData.get('model') as string;
        const language = formData.get('language') as string || 'zh';
        const enableCodeExecution = formData.get('enableCodeExecution') === 'true';

        debugLogger.logApiRequest('/api/agent', 'POST', {
          hasMessage: !!message,
          messageLength: message?.length || 0,
          hasImage: !!imageFile,
          selectedModel: selectedModel || 'default',
          language,
          enableCodeExecution
        });

        if (!message && !imageFile) {
          debugLogger.warn('AGENT_API', 'No message or image provided');
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

        debugLogger.info('AGENT_API', 'Agent configuration', {
          selectedModel: modelToUse,
          language,
          isComplexTask: isComplexTask,
          enableCodeExecution
        });

        let agentResults;
        if (isComplexTask) {
          debugLogger.info('AGENT_API', 'Using multi-agent processing');
          agentResults = await processMultiAgent(message, openai, modelToUse, language, controller, encoder, enableCodeExecution);
        } else {
          debugLogger.info('AGENT_API', 'Using single agent processing');
          agentResults = await processSingleAgent(message, openai, modelToUse, language, controller, encoder, enableCodeExecution);
        }

        // Generate final response based on agent analysis and tool results
        const history = conversationHistory ? JSON.parse(conversationHistory) : [];
        
        // 构建包含智能体分析和工具结果的上下文
        let contextualPrompt = `用户请求: ${message}\n\n`;
        
        // 添加工具执行结果
        if (agentResults.toolResults && agentResults.toolResults.length > 0) {
          contextualPrompt += "=== 工具执行结果 ===\n";
          agentResults.toolResults.forEach((toolResult, index) => {
            contextualPrompt += `工具 ${index + 1}: ${toolResult.toolName}\n`;
            contextualPrompt += `输入: ${JSON.stringify(toolResult.input, null, 2)}\n`;
            contextualPrompt += `输出: ${JSON.stringify(toolResult.output, null, 2)}\n\n`;
          });
        }
        
        // 添加智能体分析
        if ('agentAnalysis' in agentResults && agentResults.agentAnalysis) {
          contextualPrompt += `=== 智能体分析 ===\n${agentResults.agentAnalysis}\n\n`;
        } else if ('collaborationSummary' in agentResults && agentResults.collaborationSummary) {
          contextualPrompt += `=== 多智能体协作总结 ===\n${agentResults.collaborationSummary}\n\n`;
        }
        
        // 根据是否执行了代码来调整回答指令
        if ('codeExecuted' in agentResults && agentResults.codeExecuted) {
          contextualPrompt += `基于以上代码执行结果和分析，请为用户提供准确、有用的回答。请直接使用代码的计算结果，不要重新计算。如果代码解决了用户的问题，请清晰地展示结果。`;
        } else {
          contextualPrompt += `基于以上分析，请为用户提供准确、有用的回答。`;
        }

        const messages = [
          ...history,
          { 
            role: 'user', 
            content: contextualPrompt
          }
        ];

        // Calculate safe max_tokens for agent response
        const calculateSafeMaxTokens = (modelConfig: { contextLength?: number; maxTokens?: number } | null, inputTokensEstimate: number = 200) => {
          const contextLength = modelConfig?.contextLength || 4096;
          const configuredMaxTokens = modelConfig?.maxTokens || 2000;
          
          // 特殊处理某些已知限制的模型
          const modelSpecificLimits: Record<string, number> = {
            'lgai/exaone-3-5-32b-instruct': 32768,
            'Qwen/Qwen2.5-Coder-7B-Instruct': 32768,
            'Qwen/Qwen2.5-Coder-32B-Instruct': 32768,
            'Qwen/Qwen3-30B-A3B': 32768
          };
          
          const actualContextLimit = modelSpecificLimits[modelToUse] || contextLength;
          
          // Reserve more tokens for agent processing and safety margin
          const maxOutputTokens = Math.max(
            Math.min(
              configuredMaxTokens, 
              actualContextLimit - inputTokensEstimate - 300, // More conservative for agents
              4096 // Conservative max for agent responses
            ),
            200 // Minimum output tokens for agent
          );
          
          debugLogger.debug('AGENT_API', 'Agent token calculation', {
            model: modelToUse,
            contextLength,
            actualContextLimit,
            configuredMaxTokens,
            inputTokensEstimate,
            calculatedMaxTokens: maxOutputTokens
          });
          
          return maxOutputTokens;
        };

        // Estimate input tokens for all messages
        const inputText = messages.map(msg => 
          typeof msg.content === 'string' ? msg.content : ''
        ).join(' ');
        const estimatedInputTokens = Math.ceil(inputText.length / 4);
        const safeMaxTokens = calculateSafeMaxTokens(modelConfig, estimatedInputTokens);

        const finalResponse = await openai.chat.completions.create({
          model: modelToUse,
          messages,
          max_tokens: safeMaxTokens,
          temperature: Math.min(modelConfig?.temperature || 0.7, 0.3), // 智能体使用较低温度以确保准确性
          stream: true,
        });

        debugLogger.logModelCall(modelToUse, {
          messages,
          max_tokens: safeMaxTokens,
          temperature: Math.min(modelConfig?.temperature || 0.7, 0.3),
          stream: true
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

        const endTime = Date.now();
        debugLogger.logPerformance('agent_api_total', endTime - startTime, {
          model: modelToUse,
          isComplexTask,
          hasToolResults: !!(agentResults.toolResults && agentResults.toolResults.length > 0),
          codeExecuted: 'codeExecuted' in agentResults ? agentResults.codeExecuted : false
        });

        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();

      } catch (error) {
        debugLogger.error('AGENT_API', 'Agent error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
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
