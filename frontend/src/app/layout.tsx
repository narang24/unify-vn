import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { appEnv } from "@/config/env";
import { ThemeProvider } from "@/lib/theme-provider";
import { PrefsProvider } from "@/lib/prefs-context";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: `${appEnv.appName} - AI-native project workspace`,
  description:
    "Lightweight project management for students, startups, and open-source teams.",
  icons: {
    // NOTE: browsers render the favicon pixel-for-pixel — for a circular
    // tab icon, /public/logo.png itself should have transparent corners
    // (e.g. exported as a circular PNG/SVG). In-app usage (sidebar/topbar)
    // is cropped to a circle via the <Logo /> component regardless.
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
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
      className={`${inter.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <ThemeProvider>
          <PrefsProvider>
            {children}
            <Toaster />
          </PrefsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}