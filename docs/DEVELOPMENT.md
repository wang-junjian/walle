# Walle AI Assistant - Development Guide

## 🚀 Getting Started

### Prerequisites
- Node.js 18.17.0 or higher
- npm 9.0.0 or higher
- Git
- An OpenAI API key or compatible AI service

### Development Setup

1. **Clone and setup**:
```bash
git clone https://github.com/gouchicao/walle.git
cd walle
npm install
cp .env.example .env.local
```

2. **Configure environment**:
Edit `.env.local` with your API keys and settings.

3. **Start development**:
```bash
npm run dev
```

## 🏗️ Architecture Overview

### Directory Structure
```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── chat/          # Main chat endpoint
│   │   ├── models/        # Model management
│   │   └── speech/        # Voice processing
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx          # Home page
├── components/            # React components
│   ├── ChatInterface.tsx  # Main chat UI
│   ├── MessageList.tsx    # Message display
│   ├── InputArea.tsx      # Input handling
│   ├── ErrorBoundary.tsx  # Error handling
│   └── ...               # Other components
├── types/                 # TypeScript definitions
├── utils/                 # Utility functions
├── config/               # Configuration files
└── i18n/                 # Internationalization
```

### Key Technologies
- **Next.js 15**: App Router, Turbopack, Server Components
- **React 19**: Latest hooks, Suspense, Concurrent features
- **TypeScript**: Strict mode, full type coverage
- **Tailwind CSS 4**: Modern styling with container queries
- **OpenAI SDK**: AI integration with streaming support

## 🔧 Development Workflow

### Code Style
- Use TypeScript strict mode
- Follow ESLint configuration
- Use Prettier for formatting
- Write descriptive commit messages

### Component Guidelines
```typescript
// Good: Functional component with proper types
interface MyComponentProps {
  title: string;
  onAction: (id: string) => void;
  optional?: boolean;
}

export function MyComponent({ title, onAction, optional = false }: MyComponentProps) {
  // Implementation
}

// Good: Custom hooks for logic separation
export function useMyHook() {
  const [state, setState] = useState();
  // Hook logic
  return { state, actions };
}
```

### API Development
```typescript
// Good: Proper error handling and validation
export async function POST(request: NextRequest) {
  try {
    // Validate inputs
    const validation = validateInput(data);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Process request
    const result = await processRequest(data);
    return NextResponse.json(result);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

## 🎨 UI/UX Guidelines

### Design Principles
- **Accessibility First**: Support screen readers, keyboard navigation
- **Responsive Design**: Mobile-first approach
- **Performance**: Lazy loading, code splitting
- **Dark Mode**: Automatic theme detection

### Component Patterns
```tsx
// Button component example
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger';
  size: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({ variant, size, loading, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'font-medium rounded-lg transition-colors focus:outline-none focus:ring-2',
        variants[variant],
        sizes[size],
        loading && 'opacity-50 cursor-not-allowed'
      )}
      disabled={loading}
      {...props}
    >
      {loading ? <Spinner /> : children}
    </button>
  );
}
```

## 🧪 Testing Strategy

### Unit Tests
```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Integration Tests
- API endpoint testing
- Component integration tests
- E2E user flows

### Performance Testing
- Use the built-in performance monitoring utilities
- Monitor bundle sizes
- Test streaming performance

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Vercel Deployment
```bash
npx vercel --prod
```

### Environment Variables
Ensure all required environment variables are set:
- `OPENAI_API_KEY`: Required for AI functionality
- `OPENAI_BASE_URL`: API endpoint (optional)
- `OPENAI_MODEL`: Default model (optional)

## 🔍 Debugging

### Development Tools
- React DevTools
- Next.js DevTools
- Performance monitoring utilities

### Common Issues
1. **API Key Issues**: Check environment variables
2. **CORS Errors**: Verify API routes configuration
3. **Type Errors**: Run `npm run type-check`
4. **Build Errors**: Check dependencies and TypeScript config

### Logging
```typescript
// Use structured logging
import { logger } from '@/utils/logger';

logger.info('User action', { userId, action: 'send_message' });
logger.error('API error', { error: error.message, stack: error.stack });
```

## 🔄 Contributing

### Pull Request Process
1. Create feature branch: `git checkout -b feature/amazing-feature`
2. Make changes with proper tests
3. Update documentation if needed
4. Submit PR with clear description

### Code Review Checklist
- [ ] Code follows style guidelines
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] Performance impact considered
- [ ] Accessibility requirements met

## 📚 Additional Resources

### Documentation
- [Next.js 15 Documentation](https://nextjs.org/docs)
- [React 19 Documentation](https://react.dev/)
- [Tailwind CSS 4](https://tailwindcss.com/docs)
- [OpenAI API Reference](https://platform.openai.com/docs)

### Tools
- [VS Code Extensions](../.vscode/extensions.json)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

## 🐛 Troubleshooting

### Common Development Issues

**Issue**: Build fails with TypeScript errors
```bash
# Solution: Check types and run type checker
npm run type-check
```

**Issue**: Styling not applied correctly
```bash
# Solution: Rebuild Tailwind
npm run build:css
```

**Issue**: API calls failing in development
```bash
# Solution: Check environment variables and API endpoint
echo $OPENAI_API_KEY
curl -X POST http://localhost:3000/api/chat
```

For more help, check the [project issues](https://github.com/gouchicao/walle/issues) or create a new one.
