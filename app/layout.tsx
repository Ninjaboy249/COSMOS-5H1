import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "COSMOS-5H1 — IBM Granite AI",
  description:
    "An immersive AI-powered space exploration experience. Discover planets, learn astronomy, and explore the universe with IBM Granite offline AI.",
  keywords: "space, planets, AI, IBM Granite, solar system, astronomy, NASA, 3D",
  openGraph: {
    title: "COSMOS-5H1 — IBM Granite AI",
    description: "Explore the cosmos with offline IBM Granite AI",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("dark font-sans", geist.variable)}>
      <head>
        <meta name="theme-color" content="#020714" />
        <meta name="color-scheme" content="dark" />
      </head>
      <body className="bg-[#020714] text-white antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
