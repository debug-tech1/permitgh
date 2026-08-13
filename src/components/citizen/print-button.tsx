"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print rounded-sm bg-accent px-5 py-2 text-sm font-semibold text-paper hover:opacity-90"
    >
      Print / Save as PDF
    </button>
  );
}
