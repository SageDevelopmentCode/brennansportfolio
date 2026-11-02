import type { Metadata } from "next";
import { Fredoka } from "next/font/google";

const fredoka = Fredoka({
  variable: "--font-blockrealm",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Block Realm",
  description: "Place blocks, break blocks, survive the night",
};

export default function BlockRealmLayout({
  children,
}: LayoutProps<"/blockrealm">) {
  return (
    <div
      className={`${fredoka.variable} blockrealm-theme min-h-full font-[family-name:var(--font-blockrealm)]`}
    >
      {children}
    </div>
  );
}
