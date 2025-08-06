# Continue.dev Configuration Guide

Walle AI Assistant 现在完全使用 Continue.dev 标准配置格式。

## 🚀 快速开始

配置文件位置: `config.yaml`

### 基本配置

```yaml
models:
  - model: GLM-4.5-Flash
    title: GLM-4.5-Flash
    provider: openai
    apiBase: https://open.bigmodel.cn/api/paas/v4/
    apiKey: your_api_key
    roles:
      - chat

  - model: Qwen/Qwen2.5-Coder-7B-Instruct
    title: Qwen2.5-Coder-7B
    provider: openai
    apiBase: https://api.siliconflow.cn/v1
    apiKey: your_api_key
    roles:
      - edit
      - autocomplete
```

## 🎯 模型角色

- **chat**: 对话聊天
- **edit**: 代码编辑
- **autocomplete**: 自动补全

## 🎙️ 语音配置

```yaml
speechToTextProvider:
  model: FunAudioLLM/SenseVoiceSmall
  apiBase: https://api.siliconflow.cn/v1
  apiKey: your_api_key

textToSpeechProvider:
  model: FunAudioLLM/CosyVoice2-0.5B
  apiBase: https://api.siliconflow.cn/v1
  apiKey: your_api_key
  voice: FunAudioLLM/CosyVoice2-0.5B:anna
```

## 🔧 API 使用

```typescript
import { getConfigManager } from '@/config/config-manager';

const configManager = getConfigManager();
const chatModels = configManager.getChatModels();
const defaultModel = configManager.getDefaultModel('chat');
```

## 🛠️ 开发工具

### 测试配置
```bash
npm run test:config
```

### 验证设置
```bash
node scripts/test-continue-config.js
```

## 📚 更多信息

查看 Continue.dev 官方文档了解完整配置选项。
