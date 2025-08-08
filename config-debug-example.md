# Walle AI 调试模式配置示例

这是一个简化的配置文件示例，展示如何在 config.yaml 中启用调试模式。

```yaml
# 基础模型配置
models:
  - model: GLM-4.5-Flash
    name: GLM-4.5-Flash
    provider: openai
    apiBase: https://open.bigmodel.cn/api/paas/v4/
    apiKey: your-api-key-here
    contextLength: 128000
    maxTokens: 64000
    temperature: 0.7
    roles:
      - chat

# 调试配置 - 这是新增的部分
debug:
  enabled: true              # 启用调试模式
  logLevel: info             # 日志级别: debug, info, warn, error
  logModelCalls: true        # 记录模型调用的输入输出
  logApiRequests: true       # 记录API请求详情
  logToolExecutions: true    # 记录工具执行详情
  outputToFile: false        # 是否输出到文件 (开发时建议设为 false，仅控制台输出)
  logFilePath: ./debug.log   # 日志文件路径 (当 outputToFile 为 true 时使用)

# 实验性功能
experimental:
  streamResponse: true
  multimodal: true
  voiceInput: true
  voiceOutput: true
  translation: true
  imageProcessing: true
  codeCompletion: true
```

## 使用说明

1. **启用调试模式**: 将 `debug.enabled` 设置为 `true`
2. **选择日志级别**: 
   - `debug`: 最详细的日志，包含所有调试信息
   - `info`: 一般信息，包含重要的操作记录
   - `warn`: 警告信息，包含潜在问题
   - `error`: 仅记录错误信息
3. **选择日志内容**:
   - `logModelCalls`: 记录发送给AI模型的请求和响应
   - `logApiRequests`: 记录所有API端点的请求详情
   - `logToolExecutions`: 记录工具（如搜索、代码执行）的使用情况
4. **输出选项**:
   - `outputToFile: false`: 仅在控制台输出，适合开发调试
   - `outputToFile: true`: 同时输出到文件，适合生产环境分析

## 调试日志格式

当启用调试模式后，日志将以JSON格式输出，包含以下信息：

```json
{
  "timestamp": "2025-08-07T10:30:00.000Z",
  "level": "INFO",
  "category": "MODEL_CALL",
  "message": "Model GLM-4.5-Flash call completed",
  "data": {
    "model": "GLM-4.5-Flash",
    "input": {
      "messages": [
        {
          "role": "user",
          "content": "你好，请介绍一下你自己"
        }
      ]
    },
    "output": {
      "content": "我是Walle，一个AI助手...",
      "inputTokens": 15,
      "outputTokens": 45,
      "duration": "1.23",
      "tokensPerSecond": "36.59"
    }
  }
}
```

## 注意事项

⚠️ **安全提醒**:
- 调试日志可能包含敏感信息，如用户输入、API密钥等
- 在生产环境中请谨慎启用，确保日志文件安全存储
- 建议定期清理调试日志文件
- 不要将包含敏感信息的日志文件提交到版本控制系统

## 性能影响

启用调试模式会有轻微的性能影响：
- 日志记录会增加少量CPU使用
- 文件输出会增加磁盘I/O
- 建议在生产环境中仅在需要时启用

## 常见用途

1. **开发调试**: 查看模型调用的具体参数和响应
2. **性能分析**: 分析API响应时间和token使用情况
3. **问题排查**: 定位错误原因，分析用户请求流程
4. **功能验证**: 确认新功能是否正常工作
5. **监控告警**: 在生产环境中监控异常情况
