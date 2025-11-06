import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Chatbot } from '@/components/Chatbot';

export const metadata: Metadata = {
  title: 'School Portal - Concentrate.ai',
  description: 'Canvas-style school portal platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
          <Chatbot />
        </Providers>
      </body>
    </html>
  );
}
