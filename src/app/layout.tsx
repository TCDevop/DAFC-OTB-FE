import { Montserrat, JetBrains_Mono, Cormorant_Garamond } from 'next/font/google';
import './globals.css';
import '@/styles/mobile-design-system.css';
import { Providers } from './providers';

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const cormorantGaramond = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-cormorant',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata = {
  title: 'DAFC OTB Planning System',
  description: 'DAFC OTB Planning Management System',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover' as const,
};

export default function RootLayout({ children }: any) {
  // Read env vars server-side (runtime) and inject into window.__ENV__
  // This lets Azure App Service env vars take effect without rebuild
  const runtimeEnv = {
    AZURE_CLIENT_ID: process.env.AZURE_CLIENT_ID || process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || '',
    AZURE_TENANT_ID: process.env.AZURE_TENANT_ID || process.env.NEXT_PUBLIC_AZURE_TENANT_ID || '',
    API_URL: process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || '',
  };

  return (
    <html
      lang="en"
      className={`dark ${montserrat.variable} ${jetbrainsMono.variable} ${cormorantGaramond.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            // Escape </script> sequences to prevent XSS via inline script injection
            __html: `window.__ENV__ = ${JSON.stringify(runtimeEnv)
              .replace(/</g, '\\u003c')
              .replace(/>/g, '\\u003e')
              .replace(/\//g, '\\u002f')};`,
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
