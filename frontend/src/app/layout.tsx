import './globals.css';
import { Navigation } from '@/components/Navigation';

export const metadata = {
  title: 'Record Ingestion & Reporting System',
  description: 'Clean data ingestion pipeline with dead-letter forensics and live query exploration.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
