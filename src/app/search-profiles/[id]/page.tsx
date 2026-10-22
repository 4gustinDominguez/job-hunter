import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { searchProfileRepository } from "@/app/_lib/container";
import { SearchProfileForm } from "../search-profile-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const profile = await searchProfileRepository.getById(id);
  return { title: profile ? profile.name : "Search profile" };
}

export default async function EditSearchProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await searchProfileRepository.getById(id);
  if (!profile) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">{profile.name}</h1>
        <p className="text-sm text-muted">Edit this search profile.</p>
      </header>
      <SearchProfileForm profile={profile} />
    </div>
  );
}
