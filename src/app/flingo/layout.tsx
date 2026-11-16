import type { Metadata } from "next";
import { Fredoka } from "next/font/google";

const fredoka = Fredoka({
  variable: "--font-flingo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Flingo",
  description: "Drag. Fling. Smash floating junk. Climb forever. Learn nothing.",
};

export default function FlingoLayout({ children }: LayoutProps<"/flingo">) {
  return (
    <div
      className={`${fredoka.variable} flingo-theme min-h-full font-[family-name:var(--font-flingo)]`}
    >
      {children}
    </div>
  );
}
