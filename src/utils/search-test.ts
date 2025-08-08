// Serper 搜索工具测试
import { realSearchTool } from './real-tools';

// 测试搜索功能
export async function testSerperSearch() {
  console.log('🔍 测试 Serper 搜索功能...');
  
  try {
    // 测试基本搜索
    console.log('\n📝 测试基本搜索：');
    const basicResult = await realSearchTool.execute({
      query: 'Next.js 最佳实践',
      searchType: 'general',
      maxResults: 3
    });
    console.log('基本搜索结果:', JSON.stringify(basicResult, null, 2));
    
    // 测试技术搜索
    console.log('\n💻 测试技术搜索：');
    const techResult = await realSearchTool.execute({
      query: 'React TypeScript',
      searchType: 'technical',
      maxResults: 3
    });
    console.log('技术搜索结果:', JSON.stringify(techResult, null, 2));
    
    // 测试新闻搜索
    console.log('\n📰 测试新闻搜索：');
    const newsResult = await realSearchTool.execute({
      query: 'AI 人工智能',
      searchType: 'news',
      maxResults: 3
    });
    console.log('新闻搜索结果:', JSON.stringify(newsResult, null, 2));
    
  } catch (error) {
    console.error('❌ 搜索测试失败:', error);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  testSerperSearch();
}
