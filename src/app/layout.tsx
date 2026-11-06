import type { Metadata } from "next";
import { Figtree, Sora } from "next/font/google";
import "material-symbols/sharp.css";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "DOOMBOT", template: "%s | DOOMBOT" },
  description: "A personal proactive AI agent",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${figtree.variable} ${sora.variable} h-full antialiased`}>
      <body className="h-full">{children}</body>
    </html>
  );
}
