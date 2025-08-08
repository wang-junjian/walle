import OpenAI from 'openai';

// 配置
const config = {
  apiKey: 'sk-vedntqnuswjadasbmqvqomaneanxllkqxmpcfibcdwxwbieo',
  baseURL: 'https://api.siliconflow.cn/v1'
};

async function testMaxTokens(modelName) {
  console.log(`\n=== 测试 ${modelName} 的 max_tokens 限制 ===`);
  
  const openai = new OpenAI(config);
  
  const baseMessages = [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello' }
  ];

  const maxTokensToTest = [100, 500, 1000, 2000, 4000, 8000, 8192];

  for (const maxTokens of maxTokensToTest) {
    try {
      console.log(`尝试 max_tokens: ${maxTokens}`);
      const response = await openai.chat.completions.create({
        model: modelName,
        messages: baseMessages,
        max_tokens: maxTokens,
        temperature: 0.1
      });
      
      console.log(`✅ ${maxTokens} 成功`);
      
    } catch (error) {
      console.log(`❌ ${maxTokens} 失败:`, error.message);
      break; // 找到失败点后停止测试
    }
  }
}

async function testOtherParams(modelName) {
  console.log(`\n=== 测试 ${modelName} 的其他参数 ===`);
  
  const openai = new OpenAI(config);
  
  const baseMessages = [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello' }
  ];

  // 测试不同的温度值
  const temperatures = [0.0, 0.1, 0.5, 0.7, 1.0, 1.5, 2.0];
  
  for (const temp of temperatures) {
    try {
      console.log(`尝试 temperature: ${temp}`);
      const response = await openai.chat.completions.create({
        model: modelName,
        messages: baseMessages,
        max_tokens: 100, // 使用安全的值
        temperature: temp
      });
      
      console.log(`✅ temperature ${temp} 成功`);
      
    } catch (error) {
      console.log(`❌ temperature ${temp} 失败:`, error.message);
    }
  }
}

async function main() {
  const models = [
    'Qwen/Qwen2.5-Coder-7B-Instruct',
    'Qwen/Qwen2.5-Coder-32B-Instruct'
  ];
  
  for (const model of models) {
    await testMaxTokens(model);
    await testOtherParams(model);
  }
}

main().catch(console.error);
