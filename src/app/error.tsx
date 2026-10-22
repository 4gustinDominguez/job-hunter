"use client";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 py-16">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted">
        {error.message || "An unexpected error occurred while loading this page."}
      </p>
      <button
        type="button"
        onClick={retry}
        className="w-fit rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong"
      >
        Try again
      </button>
    </div>
  );
}
