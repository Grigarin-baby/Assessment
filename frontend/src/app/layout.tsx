import './globals.css';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ThemeContextProvider } from '@/theme/ThemeContext';
import { CrmLayout } from '@/components/CrmLayout';

export const metadata = {
  title: 'Record Ingestion CRM & Reporting System',
  description: 'Enterprise CRM Record Ingestion pipeline with Parent/Child history and forensic dead-letter vault.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <AntdRegistry>
          <ThemeContextProvider>
            <CrmLayout>
              {children}
            </CrmLayout>
          </ThemeContextProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
