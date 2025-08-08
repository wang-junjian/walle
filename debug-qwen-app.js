import OpenAI from 'openai';

// 配置
const config = {
  apiKey: 'sk-vedntqnuswjadasbmqvqomaneanxllkqxmpcfibcdwxwbieo',
  baseURL: 'https://api.siliconflow.cn/v1'
};

const models = [
  'Qwen/Qwen2.5-Coder-7B-Instruct',
  'Qwen/Qwen2.5-Coder-32B-Instruct'
];

async function testModelWithAppParams(modelName) {
  console.log(`\n=== 测试模型 (模拟应用参数): ${modelName} ===`);
  
  const openai = new OpenAI(config);
  
  const baseMessages = [
    {
      role: 'system',
      content: `You are Walle, a helpful AI assistant. You can process text and images. 
      Be friendly, helpful, and provide clear, concise responses. 
      If you receive an image, describe what you see and provide relevant insights.`
    },
    {
      role: 'user',
      content: 'Hello, how are you?'
    }
  ];

  // 模拟应用中的参数计算
  const modelConfig = {
    contextLength: 32768,
    maxTokens: 8192,
    temperature: 0.1,
    contextLimitOverride: 32768
  };

  const calculateSafeMaxTokens = (modelConfig, inputTokensEstimate = 100) => {
    const contextLength = modelConfig?.contextLength || 4096;
    const configuredMaxTokens = modelConfig?.maxTokens || 1000;
    const actualContextLimit = modelConfig?.contextLimitOverride || contextLength;
    
    const maxOutputTokens = Math.max(
      Math.min(
        configuredMaxTokens, 
        actualContextLimit - inputTokensEstimate - 200,
        8192
      ),
      100
    );
    
    return maxOutputTokens;
  };

  const inputText = baseMessages.map(msg => msg.content).join(' ');
  const estimatedInputTokens = Math.ceil(inputText.length / 4);
  const safeMaxTokens = calculateSafeMaxTokens(modelConfig, estimatedInputTokens);

  console.log('参数信息:', {
    estimatedInputTokens,
    safeMaxTokens,
    temperature: modelConfig.temperature
  });

  try {
    // 测试1: 非流式请求
    console.log('测试1: 非流式请求');
    const response = await openai.chat.completions.create({
      model: modelName,
      messages: baseMessages,
      max_tokens: safeMaxTokens,
      temperature: modelConfig.temperature
    });
    
    console.log('✅ 非流式成功:', response.choices[0].message.content.substring(0, 100));

    // 测试2: 流式请求
    console.log('测试2: 流式请求');
    const stream = await openai.chat.completions.create({
      model: modelName,
      messages: baseMessages,
      max_tokens: safeMaxTokens,
      temperature: modelConfig.temperature,
      stream: true
    });

    let fullResponse = '';
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) {
        fullResponse += delta.content;
      }
    }
    
    console.log('✅ 流式成功:', fullResponse.substring(0, 100));
    
  } catch (error) {
    console.log('❌ 失败:', error.message);
    console.log('状态码:', error.status);
    console.log('错误类型:', error.type);
    
    if (error.response) {
      console.log('响应数据:', error.response.data);
    }
  }
}

async function main() {
  console.log('开始测试 SiliconFlow Qwen 模型 (模拟应用参数)...');
  
  for (const model of models) {
    await testModelWithAppParams(model);
  }
}

main().catch(console.error);
