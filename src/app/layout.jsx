import { Montserrat, JetBrains_Mono } from 'next/font/google';
import './globals.css';
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

export const metadata = {
  title: 'DAFC OTB Planning System',
  description: 'DAFC OTB Planning Management System',
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`dark ${montserrat.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
