# Copilot Instructions for Walle AI Assistant

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
Walle is an AI assistant application built with Next.js, TypeScript, and Tailwind CSS. The application supports multiple input modalities:
- Natural language processing
- Text input/output
- Voice input/output 
- Image processing

## Technology Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI Integration**: OpenAI-compatible API
- **Deployment**: Vercel (recommended)

## Code Style Guidelines
- Use functional components with React hooks
- Implement proper TypeScript types for all props and functions
- Follow Tailwind CSS utility-first approach
- Use server components where possible for better performance
- Implement proper error handling and loading states

## Architecture Patterns
- Keep components small and focused on single responsibility
- Use custom hooks for complex state logic
- Implement proper separation between UI components and business logic
- Follow Next.js App Router conventions for file structure
- Use environment variables for API keys and configuration

## AI Integration Guidelines
- Use fetch API for OpenAI-compatible endpoints
- Implement proper rate limiting and error handling
- Support streaming responses for better UX
- Handle multiple input modalities (text, voice, image)
- Implement proper prompt engineering practices
