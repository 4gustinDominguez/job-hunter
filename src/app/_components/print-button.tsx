"use client";

function handlePrint(): void {
  window.print();
}

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={handlePrint}
      className="rounded-md border border-line px-3 py-1.5 text-xs font-medium hover:border-accent hover:text-accent-strong"
    >
      Print / Save as PDF
    </button>
  );
}
