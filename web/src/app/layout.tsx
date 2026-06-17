import type { Metadata } from 'next';
import { Instrument_Serif, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import SmoothScroll from '@/components/SmoothScroll';
import Cursor from '@/components/Cursor';
import Preloader from '@/components/Preloader';

const instrument = Instrument_Serif({ subsets: ['latin'], weight: '400', style: ['normal', 'italic'], variable: '--font-instrument' });
const space = Space_Grotesk({ subsets: ['latin'], variable: '--font-space' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' });

export const metadata: Metadata = {
  title: 'JudgeAI — Trustless Dispute Resolution',
  description:
    'Two parties, their evidence, one impartial verdict. GenLayer validators independently judge each case and settle on a fair resolution through Optimistic Democracy.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="no-js">
      <head>
        {/* Progressive enhancement: mark JS on so motion layers can engage,
            while the no-js CSS keeps everything legible by default. */}
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.remove('no-js');",
          }}
        />
      </head>
      <body
        className={`${instrument.variable} ${space.variable} ${jetbrains.variable}`}
        style={
          {
            ['--font-display' as string]: 'var(--font-instrument)',
            ['--font-body' as string]: 'var(--font-space)',
            ['--font-mono' as string]: 'var(--font-jetbrains)',
          } as React.CSSProperties
        }
      >
        <Preloader />
        <Cursor />
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
