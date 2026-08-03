import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SPACE_CATEGORIES } from "@/lib/space-explorer-data";
import SpaceDetailClient from "./SpaceDetailClient";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = SPACE_CATEGORIES.find((c) => c.slug === slug);
  if (!cat) return { title: "Not Found" };
  return {
    title: `${cat.title} — COSMOS-5H1`,
    description: cat.description,
  };
}

export function generateStaticParams() {
  return SPACE_CATEGORIES.map((c) => ({ slug: c.slug }));
}

export default async function SpaceDetailPage({ params }: Props) {
  const { slug } = await params;
  const cat = SPACE_CATEGORIES.find((c) => c.slug === slug);
  if (!cat) notFound();
  return <SpaceDetailClient slug={slug} />;
}
