import type { Metadata } from "next";
import { Lora } from "next/font/google";

const lora = Lora({
  variable: "--font-library",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "The Stacks",
  description: "Explore authors, discover books, and save favorites",
};

export default function LibraryLayout({ children }: LayoutProps<"/library">) {
  return (
    <div
      className={`${lora.variable} library-theme min-h-full font-[family-name:var(--font-library)]`}
    >
      {children}
    </div>
  );
}
