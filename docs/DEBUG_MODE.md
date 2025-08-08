# 调试模式使用示例

这个文档展示了如何使用Walle AI的调试模式来监控和分析系统行为。

## 快速开始

### 1. 启用调试模式

在 `config.yaml` 中添加或修改调试配置：

```yaml
debug:
  enabled: true
  logLevel: info
  logModelCalls: true
  logApiRequests: true
  logToolExecutions: true
  outputToFile: false
  logFilePath: ./debug.log
```

### 2. 通过UI启用调试

1. 打开设置页面
2. 滚动到"开发者选项"部分
3. 点击"调试设置"按钮
4. 配置所需的调试选项
5. 保存设置

## 调试日志示例

### 模型调用日志

当用户发送消息时，系统会记录完整的模型调用过程：

```json
{
  "timestamp": "2025-08-07T10:30:15.123Z",
  "level": "INFO",
  "category": "MODEL_CALL",
  "message": "Model GLM-4.5-Flash call completed",
  "data": {
    "model": "GLM-4.5-Flash",
    "input": {
      "messages": [
        {
          "role": "system",
          "content": "You are Walle, a helpful AI assistant..."
        },
        {
          "role": "user", 
          "content": "请帮我计算 123 * 456 的结果"
        }
      ],
      "max_tokens": 1000,
      "temperature": 0.7,
      "stream": true
    },
    "output": {
      "content": "我来帮你计算 123 × 456 的结果。\n\n123 × 456 = 56,088\n\n计算过程：\n- 123 × 6 = 738\n- 123 × 50 = 6,150\n- 123 × 400 = 49,200\n- 738 + 6,150 + 49,200 = 56,088",
      "inputTokens": 45,
      "outputTokens": 78,
      "totalTokens": 123,
      "duration": "2.45",
      "tokensPerSecond": "31.84",
      "finishReason": "stop"
    }
  }
}
```

### API请求日志

```json
{
  "timestamp": "2025-08-07T10:30:14.890Z",
  "level": "INFO", 
  "category": "API_REQUEST",
  "message": "API POST /api/chat completed",
  "data": {
    "endpoint": "/api/chat",
    "method": "POST",
    "params": {
      "hasMessage": true,
      "messageLength": 18,
      "hasImage": false,
      "selectedModel": "GLM-4.5-Flash",
      "hasHistory": true
    },
    "response": {
      "success": true,
      "streamingResponse": true
    }
  }
}
```

### 工具执行日志

当AI使用搜索或代码执行等工具时：

```json
{
  "timestamp": "2025-08-07T10:32:22.456Z",
  "level": "INFO",
  "category": "TOOL_EXECUTION", 
  "message": "Tool web_search completed",
  "data": {
    "tool": "web_search",
    "input": {
      "query": "最新的人工智能发展趋势",
      "searchType": "general",
      "maxResults": 5,
      "language": "zh"
    },
    "output": {
      "success": true,
      "results": [
        {
          "title": "2024年人工智能发展趋势报告",
          "url": "https://example.com/ai-trends-2024",
          "snippet": "人工智能在2024年将继续快速发展..."
        }
      ],
      "resultCount": 5,
      "searchTime": "0.85s"
    }
  }
}
```

### 性能监控日志

```json
{
  "timestamp": "2025-08-07T10:30:16.890Z",
  "level": "INFO",
  "category": "PERFORMANCE",
  "message": "Operation chat_completion took 2450ms",
  "data": {
    "operation": "chat_completion",
    "duration": 2450,
    "model": "GLM-4.5-Flash",
    "inputTokens": 45,
    "outputTokens": 78,
    "tokensPerSecond": "31.84"
  }
}
```

### 流式事件日志

```json
{
  "timestamp": "2025-08-07T10:30:15.567Z",
  "level": "DEBUG",
  "category": "STREAM",
  "message": "Stream event: content_chunk",
  "data": {
    "eventType": "content_chunk",
    "chunkLength": 15
  }
}
```

## 常见调试场景

### 1. 模型响应慢问题

查看性能日志，分析：
- `duration`: 总耗时
- `tokensPerSecond`: Token生成速度
- `inputTokens` vs `outputTokens`: Token使用情况

```bash
# 在控制台查找性能相关日志
grep "PERFORMANCE" debug.log | grep "chat_completion"
```

### 2. API调用失败

查看API请求日志和错误日志：
```bash
# 查找错误日志
grep "ERROR" debug.log | grep "API_REQUEST"
```

### 3. 工具执行问题

监控工具执行日志：
```bash
# 查找工具执行相关日志
grep "TOOL_EXECUTION" debug.log
```

### 4. 模型输出异常

检查模型调用的完整输入输出：
```bash
# 查找模型调用日志
grep "MODEL_CALL" debug.log | grep "completed"
```

## 生产环境注意事项

### 安全考虑

1. **敏感信息**: 调试日志可能包含用户输入、API密钥等敏感信息
2. **日志清理**: 定期清理调试日志文件
3. **访问控制**: 确保日志文件只能被授权人员访问

### 性能影响

1. **CPU开销**: 日志记录会增加少量CPU使用
2. **存储空间**: 启用文件输出会占用磁盘空间
3. **内存使用**: 大量日志可能影响内存使用

### 建议配置

**开发环境**:
```yaml
debug:
  enabled: true
  logLevel: debug
  logModelCalls: true
  logApiRequests: true
  logToolExecutions: true
  outputToFile: false  # 仅控制台输出
```

**测试环境**:
```yaml
debug:
  enabled: true
  logLevel: info
  logModelCalls: true
  logApiRequests: false  # 减少日志量
  logToolExecutions: true
  outputToFile: true
  logFilePath: ./logs/debug.log
```

**生产环境**:
```yaml
debug:
  enabled: false  # 通常关闭，仅在需要时启用
  logLevel: error
  logModelCalls: false
  logApiRequests: false
  logToolExecutions: false
  outputToFile: true
  logFilePath: ./logs/error.log
```

## 日志分析工具

### 使用 jq 分析JSON日志

```bash
# 统计各类日志数量
cat debug.log | jq -r '.category' | sort | uniq -c

# 查看特定时间段的日志
cat debug.log | jq 'select(.timestamp >= "2025-08-07T10:00:00Z" and .timestamp <= "2025-08-07T11:00:00Z")'

# 分析模型性能
cat debug.log | jq 'select(.category == "PERFORMANCE") | .data'

# 查找错误日志
cat debug.log | jq 'select(.level == "ERROR")'
```

### 日志监控脚本

```bash
#!/bin/bash
# monitor_logs.sh - 实时监控调试日志

# 监控错误日志
tail -f debug.log | jq 'select(.level == "ERROR")' &

# 监控性能慢的请求
tail -f debug.log | jq 'select(.category == "PERFORMANCE" and .data.duration > 5000)' &

# 监控模型调用
tail -f debug.log | jq 'select(.category == "MODEL_CALL" and .message | contains("completed"))'
```

## 故障排除

### 常见问题

1. **调试日志不显示**
   - 检查 `debug.enabled` 是否为 `true`
   - 验证配置文件语法是否正确
   - 重启应用以加载新配置

2. **日志文件无法写入**
   - 检查文件路径是否存在
   - 验证应用是否有写入权限
   - 检查磁盘空间是否充足

3. **日志过多影响性能**
   - 提高 `logLevel` 到 `warn` 或 `error`
   - 关闭不需要的日志类型
   - 定期清理日志文件

### 获取帮助

如果遇到调试相关问题，请：

1. 检查配置文件语法
2. 查看控制台错误信息
3. 提供相关日志片段
4. 在GitHub Issues中报告问题
