import type { Metadata, Viewport } from 'next';
import { Archivo_Black, Nunito, Patrick_Hand } from 'next/font/google';
import './globals.css';

const archivoBlack = Archivo_Black({ variable: '--font-archivo-black', weight: '400', subsets: ['latin'] });
const patrickHand = Patrick_Hand({ variable: '--font-patrick-hand', weight: '400', subsets: ['latin'] });
const nunito = Nunito({ variable: '--font-nunito', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Asistencia Tempenchile',
  description: 'Registro de asistencia del personal de Tempenchile Restaurante',
  icons: { icon: '/tempenchile-logo.jpg' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#e8b23a',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${archivoBlack.variable} ${patrickHand.variable} ${nunito.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
