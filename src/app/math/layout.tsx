import type { Metadata } from "next";
import { Fredoka } from "next/font/google";

const fredoka = Fredoka({
  variable: "--font-math",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Multiplication Mastery",
  description:
    "Interactive times-table practice with difficulty levels, timed drills, and device-saved progress",
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
