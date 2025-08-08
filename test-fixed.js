import OpenAI from 'openai';

// 配置
const config = {
  apiKey: 'sk-vedntqnuswjadasbmqvqomaneanxllkqxmpcfibcdwxwbieo',
  baseURL: 'https://api.siliconflow.cn/v1'
};

async function testFixedConfig(modelName) {
  console.log(`\n=== 测试修复后的配置: ${modelName} ===`);
  
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
      content: 'Hello, please write a simple Python function to calculate the factorial of a number.'
    }
  ];

  try {
    // 使用修复后的参数
    console.log('测试非流式请求 (max_tokens: 4000)');
    const response = await openai.chat.completions.create({
      model: modelName,
      messages: baseMessages,
      max_tokens: 4000,
      temperature: 0.1
    });
    
    console.log('✅ 非流式成功:', response.choices[0].message.content.substring(0, 200) + '...');
    console.log('使用的 tokens:', response.usage);

    // 测试流式请求
    console.log('\n测试流式请求 (max_tokens: 4000)');
    const stream = await openai.chat.completions.create({
      model: modelName,
      messages: baseMessages,
      max_tokens: 4000,
      temperature: 0.1,
      stream: true
    });

    let fullResponse = '';
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) {
        fullResponse += delta.content;
      }
    }
    
    console.log('✅ 流式成功:', fullResponse.substring(0, 200) + '...');
    
  } catch (error) {
    console.log('❌ 失败:', error.message);
    console.log('状态码:', error.status);
    console.log('错误类型:', error.type);
  }
}

async function main() {
  const models = [
    'Qwen/Qwen2.5-Coder-7B-Instruct',
    'Qwen/Qwen2.5-Coder-32B-Instruct'
  ];
  
  console.log('测试修复后的配置...');
  
  for (const model of models) {
    await testFixedConfig(model);
  }
}

main().catch(console.error);
