import type { Metadata } from "next";
import { Outfit } from "next/font/google";

const outfit = Outfit({
  variable: "--font-books",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Book Shelf",
  description: "Track books read and rate them",
};

export default function BooksLayout({ children }: LayoutProps<"/books">) {
  return (
    <div
      className={`${outfit.variable} books-theme min-h-full font-[family-name:var(--font-books)]`}
    >
      {children}
    </div>
  );
}
