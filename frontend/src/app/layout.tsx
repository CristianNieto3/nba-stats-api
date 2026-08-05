import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import Link from "next/link";
import { Header } from "@/components/header";
import "./globals.css";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "NBA Stats Hub",
    template: "%s · NBA Stats Hub",
  },
  description: "Player-statistics explorer for the 2025 NBA season snapshot.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${barlow.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:bg-surface focus:border focus:border-hairline focus:rounded-sm focus:px-3 focus:py-2 focus:text-ink"
        >
          Skip to content
        </a>
        <Header />
        <main id="content" className="mx-auto w-full max-w-6xl px-4 py-8 flex-1">
          {children}
        </main>
        <footer className="border-t border-hairline mt-8">
          <div className="mx-auto max-w-6xl px-4 py-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-3">
            <span>2025 season snapshot · served by a Spring Boot + PostgreSQL API</span>
            <Link href="/manage" className="hover:text-ink-2 transition-colors underline underline-offset-2">
              Data management
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
