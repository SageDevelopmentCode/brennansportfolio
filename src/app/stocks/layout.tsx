import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-market",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Ticker Tape",
  description: "Search US stocks, view prices and charts, and save your watchlist",
};

export default function StocksLayout({ children }: LayoutProps<"/stocks">) {
  return (
    <div
      className={`${spaceGrotesk.variable} market-theme min-h-full font-[family-name:var(--font-market)]`}
    >
      {children}
    </div>
  );
}
