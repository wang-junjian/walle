// 智能工具选择测试
import { selectToolsForTask } from './agent-tools';

// 测试用例
const testCases = [
  // 常识性问题 - 不应该使用工具
  { input: '天空为什么是蓝色的', expected: [], category: '常识问题' },
  { input: '什么是爱情', expected: [], category: '常识问题' },
  { input: '为什么会下雨', expected: [], category: '常识问题' },
  { input: '你好', expected: [], category: '问候' },
  { input: '谢谢', expected: [], category: '感谢' },
  { input: '解释什么是重力', expected: [], category: '物理常识' },
  
  // 数学计算 - 应该使用代码执行工具
  { input: '3333.3*4444.4=', expected: ['code_execution'], category: '数学计算' },
  { input: '计算 100 + 200 * 3', expected: ['code_execution'], category: '数学计算' },
  { input: '求 (5+3)*2 的结果', expected: ['code_execution'], category: '数学计算' },
  
  // 编程问题 - 应该使用代码执行工具
  { input: '写一个JavaScript函数计算斐波那契数列', expected: ['code_execution'], category: '编程' },
  { input: '如何用Python读取CSV文件', expected: ['code_execution'], category: '编程' },
  
  // 实时信息 - 应该使用搜索工具
  { input: '今天的天气如何', expected: ['web_search'], category: '实时信息' },
  { input: '最新的比特币价格', expected: ['web_search'], category: '实时信息' },
  { input: '2024年最新的AI技术发展', expected: ['web_search'], category: '实时信息' },
  
  // 技术文档 - 应该使用技术搜索
  { input: 'React 18的新特性和最佳实践', expected: ['web_search'], category: '技术文档' },
  { input: 'Next.js API文档', expected: ['web_search'], category: '技术文档' },
  
  // 明确搜索需求
  { input: '搜索关于机器学习的资料', expected: ['web_search'], category: '明确搜索' },
  { input: '查找苹果公司的官网', expected: ['web_search'], category: '明确搜索' },
  
  // 数据分析
  { input: '分析这组数据的平均值和标准差', expected: ['code_execution', 'data_analysis'], category: '数据分析' },
  
  // 不需要工具的复杂问题
  { input: '解释量子力学的基本原理', expected: [], category: '科学知识' },
  { input: '介绍中国古代四大发明', expected: [], category: '历史知识' },
  { input: '什么是区块链技术', expected: [], category: '技术概念' },
];

export async function testToolSelection() {
  console.log('🧪 开始测试智能工具选择逻辑...\n');
  
  let passedTests = 0;
  const totalTests = testCases.length;
  
  for (let index = 0; index < testCases.length; index++) {
    const testCase = testCases[index];
    const selectedTools = await selectToolsForTask(testCase.input);
    const selectedToolNames = selectedTools.map(tool => tool.name);
    
    const passed = JSON.stringify(selectedToolNames.sort()) === JSON.stringify(testCase.expected.sort());
    
    console.log(`测试 ${index + 1}: ${testCase.category}`);
    console.log(`输入: "${testCase.input}"`);
    console.log(`期望工具: [${testCase.expected.join(', ')}]`);
    console.log(`实际工具: [${selectedToolNames.join(', ')}]`);
    console.log(`结果: ${passed ? '✅ 通过' : '❌ 失败'}\n`);
    
    if (passed) {
      passedTests++;
    }
  }
  
  console.log(`\n📊 测试结果: ${passedTests}/${totalTests} 通过 (${((passedTests/totalTests)*100).toFixed(1)}%)`);
  
  if (passedTests === totalTests) {
    console.log('🎉 所有测试通过！工具选择逻辑优化成功！');
  } else {
    console.log('⚠️  有测试失败，需要进一步调整逻辑');
  }
  
  return { passedTests, totalTests };
}

// 如果直接运行此文件
if (require.main === module) {
  testToolSelection();
}
