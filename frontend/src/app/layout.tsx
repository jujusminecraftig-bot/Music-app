import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/Navigation';
import AudioPlayer from '@/components/AudioPlayer';
import { YouTubePlayerProvider, YTPlayerBar } from '@/components/YouTubePlayer';

const outfit = Outfit({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: 'LLTM — LetsListenToMusic',
  description: 'Your premium music streaming experience. Discover, listen, and vibe.',
  keywords: ['music', 'streaming', 'LLTM', 'LetsListenToMusic', 'discover music'],
  openGraph: {
    title: 'LLTM — LetsListenToMusic',
    description: 'Your premium music streaming experience',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className={outfit.className}>
        <YouTubePlayerProvider>
          <div className="flex min-h-screen">
            <Navigation />
            <main className="flex-1 ml-64 p-8">
              {children}
            </main>
          </div>
          <AudioPlayer />
          <YTPlayerBar />
        </YouTubePlayerProvider>
      </body>
    </html>
  );
}
