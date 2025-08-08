# Serper 搜索工具配置指南

## 概述

Walle AI 助手现在集成了 Serper API 作为智能搜索工具，可以提供实时的谷歌搜索结果。

## 配置步骤

### 1. 获取 Serper API Key

1. 访问 [Serper.dev](https://serper.dev/)
2. 注册账号并登录
3. 在控制台中获取你的 API Key
4. 每个免费账户提供 2500 次免费搜索

### 2. 配置 config.yaml

在项目根目录的 `config.yaml` 文件中添加搜索配置：

```yaml
# 搜索工具配置
searchProvider:
  provider: serper
  apiKey: YOUR_SERPER_API_KEY_HERE  # 替换为你的真实 API Key
  apiBase: https://google.serper.dev/search
  maxResults: 10
  language: zh
  location: china
```

### 3. 环境变量（可选）

为了安全起见，你也可以使用环境变量：

```bash
# .env.local
SERPER_API_KEY=your_serper_api_key_here
```

然后在 config.yaml 中引用：

```yaml
searchProvider:
  provider: serper
  apiKey: ${SERPER_API_KEY}
  # ... 其他配置
```

## 功能特性

### 支持的搜索类型

1. **general** - 通用搜索（默认）
2. **technical** - 技术文档搜索（优先 StackOverflow、GitHub、文档站点）
3. **news** - 新闻搜索
4. **academic** - 学术搜索（优先 Google Scholar、arXiv）

### 搜索结果包含

- **有机搜索结果** - 标准的网页搜索结果
- **Answer Box** - 谷歌的直接答案（如果有）
- **Knowledge Graph** - 知识图谱信息（如果有）
- **搜索统计** - 结果数量、相关性评分等

## API 使用

### 通过 HTTP API

```bash
# GET 请求
curl "http://localhost:3000/api/search?q=Next.js最佳实践&type=technical&maxResults=5"

# POST 请求
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "React TypeScript",
    "searchType": "technical",
    "maxResults": 3
  }'
```

### 在代码中使用

```typescript
import { realSearchTool } from './utils/real-tools';

// 执行搜索
const result = await realSearchTool.execute({
  query: 'Next.js 最佳实践',
  searchType: 'technical',
  maxResults: 5
});

if (result.success) {
  console.log('搜索结果:', result.results);
} else {
  console.error('搜索失败:', result.error);
}
```

## 响应格式

```typescript
interface SearchResponse {
  success: boolean;
  results: Array<{
    title: string;
    snippet: string;
    url: string;
    source: string;
    relevance: number;
    type: string;
    position?: number;
    publishDate?: string;
    entityType?: string;
  }>;
  query: string;
  searchType: string;
  summary: {
    totalResults: number;
    searchTime: string;
    topRelevance: number;
    searchStrategy: string;
    hasAnswerBox: boolean;
    hasKnowledgeGraph: boolean;
    hasRecentContent: boolean;
    searchEngine: string;
    creditsUsed: number;
  };
  language: string;
  timestamp: string;
  searchParameters: object;
}
```

## 智能工具选择

AI 助手会根据用户的输入自动选择合适的搜索类型：

- 包含技术关键词 → `technical` 搜索
- 包含新闻、最新等词汇 → `news` 搜索  
- 包含学术、论文等词汇 → `academic` 搜索
- 其他情况 → `general` 搜索

## 错误处理

常见错误及解决方案：

1. **API Key 未配置**
   ```
   Serper API key 未配置，请在 config.yaml 中设置 searchProvider.apiKey
   ```
   解决：在 config.yaml 中正确配置 API Key

2. **API 配额用完**
   ```
   Serper API 请求失败: 429 Too Many Requests
   ```
   解决：检查账户配额或升级套餐

3. **网络连接失败**
   ```
   搜索失败: fetch failed
   ```
   解决：检查网络连接和防火墙设置

## 测试

运行测试以验证配置：

```bash
# 启动开发服务器
npm run dev

# 测试搜索 API
curl "http://localhost:3000/api/search?q=test&type=general&maxResults=3"
```

## 安全注意事项

1. **API Key 保护** - 不要将 API Key 提交到版本控制系统
2. **请求频率** - 注意 API 调用频率限制
3. **内容过滤** - Serper 会过滤不当内容，但建议在应用层再次验证

## 费用说明

- **免费额度** - 2500 次搜索/月
- **付费套餐** - 根据使用量付费
- **监控使用** - 在 Serper 控制台查看使用统计

## 故障排除

如果搜索功能不工作，请检查：

1. ✅ API Key 是否正确配置
2. ✅ 网络连接是否正常
3. ✅ 配置文件语法是否正确
4. ✅ 开发服务器是否正常运行
5. ✅ 控制台是否有错误信息

如果问题持续存在，请检查 Serper.dev 的服务状态和 API 文档。
