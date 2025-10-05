import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import 'animate.css';

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Frida – AI-Powered Onboarding Solution",
  description: "Intelligent lending platform powered by AI for smarter financial decisions",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover', // Enable safe area for notch/home indicator
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ scrollBehavior: 'auto',overflow: 'hidden' }}>
      <body
        className={`${geistMono.variable} antialiased`}
        style={{ overflow: 'hidden' }}
      >
        {children}
      </body>
    </html>
  );
}
