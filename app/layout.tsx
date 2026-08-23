import type { Metadata } from "next";
import { Geist, Kaushan_Script } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });
const kaushanScript = Kaushan_Script({ subsets: ['latin'], weight: '400', variable: '--font-script' });

export const metadata: Metadata = {
  title: "COSMOS-5H1 — AI Space Explorer",
  description:
    "An immersive, offline-capable space exploration experience with interactive 3D models, local retrieval, and optional cloud AI.",
  keywords: "space, planets, AI, solar system, astronomy, NASA, 3D",
  openGraph: {
    title: "COSMOS-5H1 — AI Space Explorer",
    description: "Explore the cosmos with interactive 3D models and offline-capable AI",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("dark font-sans", geist.variable, kaushanScript.variable)}>
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
