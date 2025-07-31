# 🤖 Walle AI Assistant

Walle is an intelligent AI assistant application built with Next.js, TypeScript, and Tailwind CSS. It supports multiple input modalities including text, voice, and image interactions, providing a comprehensive AI-powered experience.

## ✨ Features

- **Multi-modal Input**: Support for text, voice, and image inputs
- **Real-time Chat**: Interactive chat interface with streaming responses
- **Image Analysis**: Upload and analyze images with AI-powered insights
- **Voice Integration**: Voice input and output capabilities (coming soon)
- **Modern UI**: Clean, responsive design with dark mode support
- **OpenAI Compatible**: Works with OpenAI API and compatible services
- **TypeScript**: Full type safety and excellent developer experience

## 🚀 Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI Integration**: OpenAI SDK
- **Icons**: Lucide React
- **Deployment**: Vercel (recommended)

## 📦 Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd walle
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Add your API keys to `.env.local`:
```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key | Yes |
| `OPENAI_BASE_URL` | OpenAI API base URL | No (defaults to OpenAI) |
| `NEXT_PUBLIC_APP_NAME` | Application name | No |
| `NEXT_PUBLIC_APP_VERSION` | Application version | No |

### API Compatibility

Walle is designed to work with OpenAI-compatible APIs. You can use:
- OpenAI GPT models
- Azure OpenAI Service
- Other OpenAI-compatible services

## 🎯 Usage

1. **Text Chat**: Type your message and press Enter or click Send
2. **Image Analysis**: Click the image icon to upload an image for analysis
3. **Voice Input**: Click the microphone icon to start voice recording (coming soon)

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   └── chat/          # Chat API endpoint
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx          # Home page
├── components/            # React components
│   ├── ChatInterface.tsx  # Main chat interface
│   ├── MessageList.tsx    # Message list component
│   ├── MessageBubble.tsx  # Individual message bubble
│   └── InputArea.tsx      # Input area with file/voice support
├── types/                 # TypeScript type definitions
│   └── chat.ts           # Chat-related types
└── utils/                 # Utility functions
    └── time.ts           # Time formatting utilities
```

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues or have questions, please open an issue on GitHub or contact the development team.

---

Built with ❤️ using Next.js and OpenAI
