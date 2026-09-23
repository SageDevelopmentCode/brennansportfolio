import type { Metadata } from "next";
import { Fredoka } from "next/font/google";

const fredoka = Fredoka({
  variable: "--font-torch",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Torch Pop",
  description: "Throw torches to pop bubbles — 1 point each",
};

export default function TorchLayout({ children }: LayoutProps<"/torch">) {
  return (
    <div
      className={`${fredoka.variable} torch-theme min-h-full font-[family-name:var(--font-torch)]`}
    >
      {children}
    </div>
  );
}
