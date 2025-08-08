// 智能聊天系统测试
import { getSmartChatProcessor } from './smart-chat-processor';

// 测试用例
const testCases = [
  // 1. 问候类 - 不应该显示思考过程
  {
    input: '你好',
    expectedThinking: false,
    expectedTools: 0,
    category: '问候'
  },
  
  // 2. 常识问题 - 不应该显示思考过程
  {
    input: '天空为什么是蓝色的',
    expectedThinking: false,
    expectedTools: 0,
    category: '常识'
  },
  
  // 3. 概念解释 - 不应该显示思考过程
  {
    input: '什么是区块链',
    expectedThinking: false,
    expectedTools: 0,
    category: '概念'
  },
  
  // 4. 数学计算 - 应该显示快速思考 + 代码执行
  {
    input: '3333.3*4444.4=',
    expectedThinking: true,
    expectedTools: 1,
    category: '数学计算'
  },
  
  // 5. 复杂计算 - 应该显示思考 + 代码执行
  {
    input: '计算 (100 + 200) * 3 - 50 的结果',
    expectedThinking: true,
    expectedTools: 1,
    category: '复杂计算'
  },
  
  // 6. 实时信息 - 应该显示思考 + 搜索
  {
    input: '今天北京的天气如何',
    expectedThinking: true,
    expectedTools: 1,
    category: '实时信息'
  },
  
  // 7. 编程问题 - 应该显示逐步思考 + 代码执行
  {
    input: '写一个JavaScript函数计算斐波那契数列',
    expectedThinking: true,
    expectedTools: 1,
    category: '编程问题'
  },
  
  // 8. 复杂分析 - 应该显示深度思考
  {
    input: '分析人工智能对未来就业市场的影响',
    expectedThinking: true,
    expectedTools: 0,
    category: '复杂分析'
  },
  
  // 9. 明确搜索 - 应该显示思考 + 搜索
  {
    input: '搜索关于 Next.js 的最新信息',
    expectedThinking: true,
    expectedTools: 1,
    category: '明确搜索'
  },
  
  // 10. 感谢 - 不应该显示思考过程
  {
    input: '谢谢你的帮助',
    expectedThinking: false,
    expectedTools: 0,
    category: '感谢'
  }
];

export async function testSmartChatSystem() {
  console.log('🧪 开始测试智能聊天系统...\n');
  
  const processor = getSmartChatProcessor();
  let passedTests = 0;
  const totalTests = testCases.length;
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    
    console.log(`\n📝 测试 ${i + 1}/${totalTests}: ${testCase.category}`);
    console.log(`输入: "${testCase.input}"`);
    
    try {
      const result = await processor.processMessage(testCase.input);
      
      // 检查思考过程
      const thinkingMatch = result.shouldShowThinking === testCase.expectedThinking;
      
      // 检查工具使用
      const toolsCount = result.toolsUsed?.length || 0;
      const toolsMatch = testCase.expectedTools === 0 ? 
        toolsCount === 0 : 
        toolsCount > 0;
      
      const passed = thinkingMatch && toolsMatch;
      
      console.log(`期望思考: ${testCase.expectedThinking}, 实际: ${result.shouldShowThinking} ${thinkingMatch ? '✅' : '❌'}`);
      console.log(`期望工具: ${testCase.expectedTools}, 实际: ${toolsCount} ${toolsMatch ? '✅' : '❌'}`);
      console.log(`决策推理: ${result.metadata.decision.reasoning}`);
      console.log(`复杂度: ${result.metadata.decision.estimatedComplexity}`);
      console.log(`信心度: ${result.metadata.decision.confidence}`);
      console.log(`处理时间: ${result.metadata.processingTime}ms`);
      
      if (result.thinkingSteps) {
        console.log(`思考步骤: ${result.thinkingSteps.map(s => s.title).join(' → ')}`);
      }
      
      console.log(`结果: ${passed ? '✅ 通过' : '❌ 失败'}`);
      
      if (passed) {
        passedTests++;
      }
      
    } catch (error) {
      console.log(`❌ 测试失败: ${error}`);
    }
  }
  
  console.log(`\n📊 测试总结: ${passedTests}/${totalTests} 通过 (${((passedTests/totalTests)*100).toFixed(1)}%)`);
  
  if (passedTests === totalTests) {
    console.log('🎉 所有测试通过！智能聊天系统运行正常！');
  } else {
    console.log('⚠️  部分测试失败，需要进一步调整');
  }
  
  // 展示系统改进
  console.log('\n🚀 系统改进亮点:');
  console.log('- ✅ 基于语义理解而非关键字匹配');
  console.log('- ✅ 智能决策是否显示思考过程');
  console.log('- ✅ 自适应思考策略（quick/deep/step-by-step）');
  console.log('- ✅ 避免对常识问题过度使用工具');
  console.log('- ✅ 提高用户体验和响应效率');
  
  return { passedTests, totalTests };
}

// 演示智能决策对比
export async function demonstrateIntelligentDecision() {
  console.log('\n🎯 智能决策演示:\n');
  
  const examples = [
    '你好',
    '天空为什么是蓝色的',
    '3333.3*4444.4=',
    '今天的天气怎么样',
    '分析人工智能的发展趋势'
  ];
  
  const processor = getSmartChatProcessor();
  
  for (const example of examples) {
    console.log(`💬 "${example}"`);
    
    try {
      const result = await processor.processMessage(example);
      const decision = result.metadata.decision;
      
      console.log(`   🧠 决策: ${decision.needsThinking ? '需要思考' : '直接回答'}`);
      console.log(`   📝 策略: ${decision.thinkingStrategy}`);
      console.log(`   🔧 工具: [${decision.toolsRequired.join(', ') || '无'}]`);
      console.log(`   📊 复杂度: ${decision.estimatedComplexity}`);
      console.log(`   🎯 推理: ${decision.reasoning}`);
      console.log(`   ⚡ 处理时间: ${result.metadata.processingTime}ms\n`);
      
    } catch (error) {
      console.log(`   ❌ 处理失败: ${error}\n`);
    }
  }
}

// 如果直接运行此文件
if (require.main === module) {
  (async () => {
    await testSmartChatSystem();
    await demonstrateIntelligentDecision();
  })();
}
