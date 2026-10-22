import type { Metadata } from "next";
import { SearchProfileForm } from "../search-profile-form";

export const metadata: Metadata = { title: "New search profile" };

export default function NewSearchProfilePage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">New search profile</h1>
        <p className="text-sm text-muted">Define what jobs you want to fetch.</p>
      </header>
      <SearchProfileForm />
    </div>
  );
}
