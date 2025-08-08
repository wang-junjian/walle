// 测试智能决策引擎
const testMessage = '"http://localhost:3000/"这个字符串有几个0';

console.log('测试消息:', testMessage);

// 模拟判断提示词构建
const judgmentPrompt = `
你是一个智能助手的决策引擎。请判断用户的问题是否需要通过编写和执行代码来解决。

用户问题：「${testMessage}」

判断标准：
1. 需要代码执行的情况：
   - 数学计算（如：计算表达式、统计数字等）
   - 数据处理和分析
   - 算法实现和验证
   - 字符串处理（如：计算字符数量、查找模式等）
   - 文件操作模拟
   - 复杂逻辑运算

2. 不需要代码执行的情况：
   - 基础常识问答
   - 概念解释
   - 建议和意见
   - 创意写作
   - 简单对话
   - 历史知识

请只回答"是"或"否"，不要添加任何解释。

示例：
- "http://localhost:3000/这个字符串有几个0" → 是
- "计算 123 + 456" → 是
- "什么是人工智能" → 否
- "你好，今天天气怎么样" → 否
- "分析这组数据：[1,2,3,4,5]" → 是

回答：`;

console.log('\n构建的判断提示词:');
console.log(judgmentPrompt);

// 模拟后备检查逻辑
function fallbackCodeExecutionCheck(message) {
  const codeIndicators = [
    /计算.*?\d/, // 计算相关
    /\d+.*?个/, // 数量统计
    /分析.*?数据/, // 数据分析
    /统计/, // 统计
    /[\d+\-*/()=]/, // 数学表达式
  ];
  
  return codeIndicators.some(pattern => pattern.test(message));
}

console.log('\n后备检查结果:', fallbackCodeExecutionCheck(testMessage));

// 测试不同类型的问题
const testCases = [
  '"http://localhost:3000/"这个字符串有几个0',
  '计算 123 + 456',
  '什么是人工智能',
  '你好，今天天气怎么样',
  '分析这组数据：[1,2,3,4,5]',
  '这个字符串包含多少个字符：hello world',
  '解释一下机器学习的概念',
  '计算圆的面积，半径是5'
];

console.log('\n所有测试用例的后备检查结果:');
testCases.forEach(testCase => {
  const result = fallbackCodeExecutionCheck(testCase);
  console.log(`"${testCase}" → ${result ? '需要代码' : '不需要代码'}`);
});
