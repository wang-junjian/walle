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

async function testModel(modelName) {
  console.log(`\n=== 测试模型: ${modelName} ===`);
  
  const openai = new OpenAI(config);
  
  try {
    // 最简单的请求
    const response = await openai.chat.completions.create({
      model: modelName,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello, please respond with "Hi!"' }
      ],
      max_tokens: 100,
      temperature: 0.7
    });
    
    console.log('✅ 成功:', response.choices[0].message.content);
  } catch (error) {
    console.log('❌ 失败:', error.message);
    console.log('状态码:', error.status);
    console.log('错误类型:', error.type);
    
    // 尝试获取更多错误信息
    if (error.response) {
      console.log('响应数据:', error.response.data);
    }
  }
}

async function testAvailableModels() {
  console.log('\n=== 测试获取可用模型列表 ===');
  
  const openai = new OpenAI(config);
  
  try {
    const models = await openai.models.list();
    console.log('✅ 可用模型数量:', models.data.length);
    
    // 查找 Qwen 相关模型
    const qwenModels = models.data.filter(m => m.id.includes('Qwen'));
    console.log('Qwen 模型:');
    qwenModels.forEach(m => console.log(`  - ${m.id}`));
    
  } catch (error) {
    console.log('❌ 获取模型列表失败:', error.message);
  }
}

async function main() {
  console.log('开始测试 SiliconFlow Qwen 模型...');
  
  // 首先测试获取模型列表
  await testAvailableModels();
  
  // 然后测试每个模型
  for (const model of models) {
    await testModel(model);
  }
}

main().catch(console.error);
