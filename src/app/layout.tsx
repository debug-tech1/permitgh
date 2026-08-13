import type { Metadata } from "next";
import { NavBar } from "@/components/nav-bar";
import "./globals.css";

export const metadata: Metadata = {
  title: "PermitGH — Municipal Service Request Tracker",
  description:
    "Track municipal permit applications against their statutory turnaround time, and see how each service performs.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-paper text-ink">
        <NavBar />
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">{children}</main>
        <footer className="border-t border-line px-6 py-6 text-center text-xs text-ink-soft">
          PermitGH — a CSCD602 Advanced Software Engineering capstone project.
        </footer>
      </body>
    </html>
  );
}
