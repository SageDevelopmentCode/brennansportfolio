import type { Metadata } from "next";
import { Literata } from "next/font/google";

const literata = Literata({
  variable: "--font-spelling",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Spell Sound",
  description:
    "6th-grade spelling practice — hear each word, type it, and track mastery on this device",
};

export default function SpellingLayout({ children }: LayoutProps<"/spelling">) {
  return (
    <div
      className={`${literata.variable} spelling-theme min-h-full font-[family-name:var(--font-spelling)]`}
    >
      {children}
    </div>
  );
}
