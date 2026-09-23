import type { Metadata } from "next";
import { Fredoka } from "next/font/google";

const fredoka = Fredoka({
  variable: "--font-chess",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Royal Check",
  description: "Play full-rule chess against the computer",
};

export default function ChessLayout({ children }: LayoutProps<"/chess">) {
  return (
    <div
      className={`${fredoka.variable} chess-theme min-h-full font-[family-name:var(--font-chess)]`}
    >
      {children}
    </div>
  );
}
