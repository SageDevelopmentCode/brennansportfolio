import type { Metadata } from "next";
import { Exo_2 } from "next/font/google";

const exo = Exo_2({
  variable: "--font-solarsystem",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Solar System Explorer",
  description:
    "Explore the Sun and planets in 3D — tap any world for NASA facts and imagery",
};

export default function SolarSystemLayout({
  children,
}: LayoutProps<"/solar-system">) {
  return (
    <div
      className={`${exo.variable} solarsystem-theme min-h-full font-[family-name:var(--font-solarsystem)]`}
    >
      {children}
    </div>
  );
}
