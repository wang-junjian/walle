import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/components/I18nProvider";

export const metadata: Metadata = {
  title: "Walle AI Assistant",
  description: "Your intelligent assistant for text, voice, and image interactions",
  keywords: ["AI", "assistant", "chat", "voice", "image", "artificial intelligence"],
  authors: [{ name: "Walle AI Team" }],
  openGraph: {
    title: "Walle AI Assistant",
    description: "Your intelligent assistant for text, voice, and image interactions",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <I18nProvider>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
