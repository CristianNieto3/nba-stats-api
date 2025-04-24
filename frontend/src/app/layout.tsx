import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// app/layout.tsx

export const metadata = {
  title: "NBA Player Stats Hub",
  description: "Track NBA player stats in real-time. Compare players. View stat leaders. Built with Spring Boot + PostgreSQL + Next.js.",
  openGraph: {
    title: "NBA Player Stats Hub",
    description: "Track NBA player stats in real-time. Compare players. View stat leaders.",
    url: "http://localhost:3000/",
    siteName: "NBA Player Stats Hub",
    images: [
      {
        
        width: 1200,
        height: 630,
        alt: "NBA Stats Hub Open Graph Image",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NBA Player Stats Hub",
    description: "Real-time stats. Compare players. View leaders.",
    creator: "@Cristian_Nieto3",
    
  },
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
