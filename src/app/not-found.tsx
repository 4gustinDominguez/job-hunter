import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 py-16">
      <h1 className="text-xl font-semibold">Not found</h1>
      <p className="text-sm text-muted">This page or record does not exist.</p>
      <Link
        href="/"
        className="w-fit rounded-md border border-line bg-surface px-4 py-2 text-sm font-medium hover:bg-paper"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
