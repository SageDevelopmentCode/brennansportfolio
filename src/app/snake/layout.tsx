import type { Metadata } from "next";
import { Fredoka } from "next/font/google";

const fredoka = Fredoka({
  variable: "--font-snake",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Dot Snake",
  description: "Grow your snake inside the red-dot box",
};

export default function SnakeLayout({ children }: LayoutProps<"/snake">) {
  return (
    <div
      className={`${fredoka.variable} snake-theme min-h-full font-[family-name:var(--font-snake)]`}
    >
      {children}
    </div>
  );
}
