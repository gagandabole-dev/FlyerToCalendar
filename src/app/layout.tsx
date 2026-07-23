import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FlyerToCalendar",
  description: "Convert event flyer timetables into structured calendar events instantly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col bg-slate-950 text-slate-100`}
      >
        <div className="flex-grow">
          {children}
        </div>
        <footer className="w-full py-6 border-t border-slate-900 bg-slate-950/80 text-slate-500 text-center text-xs space-y-2 mt-auto backdrop-blur-md">
          <p>© {new Date().getFullYear()} FlyerToCalendar. All rights reserved.</p>
          <div className="flex justify-center gap-4 text-[11px] font-medium">
            <Link href="/impressum" className="hover:text-indigo-400 transition-colors">
              Impressum (Legal Imprint)
            </Link>
            <span className="text-slate-800">•</span>
            <Link href="/datenschutz" className="hover:text-indigo-400 transition-colors">
              Datenschutzerklärung (Privacy Policy)
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}

