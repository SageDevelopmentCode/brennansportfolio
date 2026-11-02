import type { Metadata } from "next";
import { Fredoka } from "next/font/google";

const fredoka = Fredoka({
  variable: "--font-eggs",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Hungry Ape Run",
  description:
    "Jungle endless runner — dodge logs, jump stumps, collect bananas before you starve",
};

export default function EggsLayout({ children }: LayoutProps<"/eggs">) {
  return (
    <div
      className={`${fredoka.variable} eggs-theme min-h-full font-[family-name:var(--font-eggs)]`}
    >
      {children}
    </div>
  );
}
