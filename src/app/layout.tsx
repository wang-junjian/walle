import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/components/I18nProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "Walle AI Assistant",
  description: "Your intelligent assistant for text, voice, and image interactions",
  keywords: ["AI", "assistant", "chat", "voice", "image", "artificial intelligence", "multimodal", "OpenAI"],
  authors: [{ name: "Walle AI Team" }],
  creator: "Walle AI Team",
  publisher: "Walle AI",
  robots: "index, follow",
  openGraph: {
    title: "Walle AI Assistant",
    description: "Your intelligent assistant for text, voice, and image interactions",
    type: "website",
    locale: "en_US",
    siteName: "Walle AI Assistant",
  },
  twitter: {
    card: "summary_large_image",
    title: "Walle AI Assistant",
    description: "Your intelligent assistant for text, voice, and image interactions",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1f2937" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ErrorBoundary>
          <I18nProvider>
            {children}
          </I18nProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
