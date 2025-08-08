import { NextRequest, NextResponse } from 'next/server';
import { realSearchTool } from '../../../utils/real-tools';
import { debugLogger } from '../../../utils/debug-logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    debugLogger.info('SEARCH_API', 'Search API POST request started');
    
    const body = await request.json();
    const { 
      query, 
      searchType = 'general',
      maxResults = 5 
    } = body;

    debugLogger.logApiRequest('/api/search', 'POST', {
      query,
      searchType,
      maxResults
    });

    if (!query) {
      debugLogger.warn('SEARCH_API', 'Empty search query provided');
      return NextResponse.json(
        { error: '搜索查询不能为空' },
        { status: 400 }
      );
    }

    // 执行搜索
    const result = await realSearchTool.execute({
      query,
      searchType,
      maxResults
    });

    const endTime = Date.now();
    debugLogger.logPerformance('search_api_post', endTime - startTime, {
      query,
      searchType,
      resultsCount: Array.isArray(result.results) ? result.results.length : 0
    });

    debugLogger.logApiRequest('/api/search', 'POST', { query, searchType, maxResults }, result);

    return NextResponse.json(result);
  } catch (error) {
    const endTime = Date.now();
    debugLogger.logPerformance('search_api_post', endTime - startTime, { error: true });
    debugLogger.error('SEARCH_API', 'Search API error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { 
        success: false,
        error: `搜索请求失败: ${error instanceof Error ? error.message : String(error)}` 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    debugLogger.info('SEARCH_API', 'Search API GET request started');
    
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const searchType = searchParams.get('type') || 'general';
    const maxResults = parseInt(searchParams.get('maxResults') || '5');

    debugLogger.logApiRequest('/api/search', 'GET', {
      query,
      searchType,
      maxResults
    });

    if (!query) {
      debugLogger.warn('SEARCH_API', 'Missing query parameter q');
      return NextResponse.json(
        { error: '缺少查询参数 q' },
        { status: 400 }
      );
    }

    const result = await realSearchTool.execute({
      query,
      searchType,
      maxResults
    });

    const endTime = Date.now();
    debugLogger.logPerformance('search_api_get', endTime - startTime, {
      query,
      searchType,
      resultsCount: Array.isArray(result.results) ? result.results.length : 0
    });

    debugLogger.logApiRequest('/api/search', 'GET', { query, searchType, maxResults }, result);

    return NextResponse.json(result);
  } catch (error) {
    const endTime = Date.now();
    debugLogger.logPerformance('search_api_get', endTime - startTime, { error: true });
    debugLogger.error('SEARCH_API', 'Search API GET error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { 
        success: false,
        error: `搜索请求失败: ${error instanceof Error ? error.message : String(error)}` 
      },
      { status: 500 }
    );
  }
}
