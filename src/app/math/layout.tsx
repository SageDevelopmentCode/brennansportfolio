import type { Metadata } from "next";
import { Fredoka } from "next/font/google";

const fredoka = Fredoka({
  variable: "--font-math",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Math Blitz",
  description: "Practice multiplication with streaks, badges, and speed rounds",
};

export default function MathLayout({ children }: LayoutProps<"/math">) {
  return (
    <div
      className={`${fredoka.variable} math-theme min-h-full font-[family-name:var(--font-math)]`}
    >
      {children}
    </div>
  );
}
