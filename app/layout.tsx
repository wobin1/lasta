import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Atelier — Workshop",
  description: "Shoe manufacturing and business management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} h-full`} suppressHydrationWarning>
      <body
        className="min-h-full bg-[var(--ground)] font-sans text-[var(--text)] antialiased"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
