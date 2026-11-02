import type { Metadata } from "next";
import { Fredoka } from "next/font/google";

const fredoka = Fredoka({
  variable: "--font-rocketfist",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Rocket Fist",
  description: "Junkyard arena — punch monsters, dash, and survive the bosses",
};

export default function RocketFistLayout({
  children,
}: LayoutProps<"/rocket-fist">) {
  return (
    <div
      className={`${fredoka.variable} rocketfist-theme min-h-full font-[family-name:var(--font-rocketfist)]`}
    >
      {children}
    </div>
  );
}
