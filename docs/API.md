# Walle AI Assistant - API Documentation

## Overview

Walle provides a set of RESTful API endpoints for AI chat functionality, model management, and voice processing. All APIs follow OpenAI-compatible standards where applicable.

## Base URL
```
https://your-domain.com/api
```

For local development:
```
http://localhost:3000/api
```

## Authentication

Currently, authentication is handled via environment variables on the server side. Client-side authentication may be added in future versions.

## Content Types

- Request: `multipart/form-data` (for file uploads) or `application/json`
- Response: `application/json` or `text/event-stream` (for streaming)

---

## Endpoints

### 1. Chat API

#### POST `/api/chat`

Send a message to the AI assistant with optional image attachment.

**Request Format**: `multipart/form-data`

**Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | No* | Text message to send to AI |
| `image` | File | No* | Image file for analysis |
| `history` | string | No | JSON string of conversation history |
| `model` | string | No | Specific model to use for this request |

*Either `message` or `image` must be provided.

**Example Request**:
```javascript
const formData = new FormData();
formData.append('message', 'Hello, can you help me?');
formData.append('history', JSON.stringify([
  { role: 'user', content: 'Previous message' },
  { role: 'assistant', content: 'Previous response' }
]));
formData.append('model', 'gpt-4o');

const response = await fetch('/api/chat', {
  method: 'POST',
  body: formData
});
```

**Response Format**: `text/event-stream`

The API returns a streaming response with Server-Sent Events (SSE). Each event contains JSON data:

**Event Types**:

1. **Content Event**:
```json
{
  "type": "content",
  "content": "Partial response text"
}
```

2. **Reasoning Event** (for reasoning models):
```json
{
  "type": "reasoning",
  "reasoning_content": "Internal thinking process"
}
```

3. **Statistics Event**:
```json
{
  "type": "stats",
  "inputTokens": 50,
  "outputTokens": 100,
  "totalTokens": 150,
  "duration": "2.34",
  "tokensPerSecond": "42.74",
  "finishReason": "stop"
}
```

4. **Error Event**:
```json
{
  "type": "error",
  "error": "Error message",
  "details": "Detailed error information"
}
```

**Complete Example**:
```javascript
async function sendMessage(message, imageFile = null) {
  const formData = new FormData();
  formData.append('message', message);
  if (imageFile) {
    formData.append('image', imageFile);
  }

  const response = await fetch('/api/chat', {
    method: 'POST',
    body: formData
  });

  if (!response.body) throw new Error('No response body');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          
          try {
            const parsed = JSON.parse(data);
            handleStreamChunk(parsed);
          } catch (e) {
            console.error('Failed to parse chunk:', data);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function handleStreamChunk(chunk) {
  switch (chunk.type) {
    case 'content':
      console.log('Content:', chunk.content);
      break;
    case 'reasoning':
      console.log('Reasoning:', chunk.reasoning_content);
      break;
    case 'stats':
      console.log('Stats:', chunk);
      break;
    case 'error':
      console.error('Error:', chunk.error);
      break;
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid input parameters
- `413 Payload Too Large`: File size exceeds limits
- `415 Unsupported Media Type`: Invalid file type
- `500 Internal Server Error`: Server or AI service error

---

### 2. Models API

#### GET `/api/models`

Retrieve the list of available AI models.

**Parameters**: None

**Response**:
```json
{
  "models": [
    {
      "id": "gpt-4o-mini",
      "name": "GPT-4o Mini",
      "description": "Fast and efficient model for general tasks",
      "capabilities": ["text", "vision"]
    },
    {
      "id": "gpt-4o",
      "name": "GPT-4o",
      "description": "Advanced multimodal model",
      "capabilities": ["text", "vision", "reasoning"]
    }
  ]
}
```

**Example**:
```javascript
const response = await fetch('/api/models');
const data = await response.json();
console.log('Available models:', data.models);
```

---

### 3. Speech API

#### POST `/api/speech`

Convert text to speech or process voice input.

**Request Format**: `application/json`

**Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | string | Yes | Text to convert to speech |
| `voice` | string | No | Voice to use (default: 'alloy') |
| `format` | string | No | Audio format (default: 'mp3') |

**Response**: Audio file (binary data)

**Example**:
```javascript
const response = await fetch('/api/speech', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: 'Hello, this is a test message.',
    voice: 'alloy',
    format: 'mp3'
  })
});

const audioBlob = await response.blob();
const audioUrl = URL.createObjectURL(audioBlob);
const audio = new Audio(audioUrl);
audio.play();
```

#### POST `/api/speech/debug`

Debug endpoint for speech functionality testing.

**Parameters**: Same as `/api/speech`

**Response**: JSON with debug information and audio data

---

## Rate Limits

Currently, no explicit rate limiting is implemented. However, consider:
- OpenAI API rate limits apply
- Large file uploads may be slow
- Streaming responses should be handled properly

## File Upload Limits

- **Maximum file size**: 20MB
- **Supported formats**: JPEG, PNG, GIF, WebP
- **Maximum message length**: 10,000 characters

## Error Handling

All endpoints return consistent error formats:

```json
{
  "error": "Human-readable error message",
  "details": "Technical details (in development mode)",
  "code": "ERROR_CODE"
}
```

Common error codes:
- `INVALID_INPUT`: Malformed request data
- `FILE_TOO_LARGE`: File exceeds size limits
- `UNSUPPORTED_FORMAT`: Invalid file format
- `AI_SERVICE_ERROR`: AI provider error
- `INTERNAL_ERROR`: Server error

## SDK and Libraries

### JavaScript/TypeScript
```javascript
// Simple client wrapper
class WalleClient {
  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
  }

  async sendMessage(message, options = {}) {
    const formData = new FormData();
    formData.append('message', message);
    
    if (options.image) formData.append('image', options.image);
    if (options.model) formData.append('model', options.model);
    if (options.history) formData.append('history', JSON.stringify(options.history));

    return fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      body: formData
    });
  }

  async getModels() {
    const response = await fetch(`${this.baseUrl}/models`);
    return response.json();
  }

  async textToSpeech(text, voice = 'alloy') {
    const response = await fetch(`${this.baseUrl}/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice })
    });
    return response.blob();
  }
}

// Usage
const client = new WalleClient();
const response = await client.sendMessage('Hello!');
```

## Webhooks (Future)

Planned webhook support for:
- Conversation completion events
- Error notifications
- Usage analytics

## Versioning

Current API version: `v1`

Future versions will be available at `/api/v2`, etc., with backward compatibility maintained for at least one major version.

## Support

For API support:
- Check the [GitHub Issues](https://github.com/gouchicao/walle/issues)
- Review the [Development Guide](./DEVELOPMENT.md)
- Consult the [OpenAI API Documentation](https://platform.openai.com/docs) for model-specific details
