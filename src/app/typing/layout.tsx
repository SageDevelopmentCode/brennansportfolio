import type { Metadata } from "next";
import { Fredoka } from "next/font/google";

const fredoka = Fredoka({
  variable: "--font-typing",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Key Blitz",
  description: "Neon arcade typing — race the clock, drop words, survive the blitz",
};

export default function TypingLayout({ children }: LayoutProps<"/typing">) {
  return (
    <div
      className={`${fredoka.variable} typing-theme min-h-full font-[family-name:var(--font-typing)]`}
    >
      {children}
    </div>
  );
}
