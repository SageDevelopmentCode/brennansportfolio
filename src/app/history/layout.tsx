import type { Metadata } from "next";
import { Libre_Baskerville } from "next/font/google";

const libreBaskerville = Libre_Baskerville({
  variable: "--font-history",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "US History",
  description:
    "Explore a timeline of American milestones with live Wikipedia details",
};

export default function HistoryLayout({ children }: LayoutProps<"/history">) {
  return (
    <div
      className={`${libreBaskerville.variable} history-theme min-h-full font-[family-name:var(--font-history)]`}
    >
      {children}
    </div>
  );
}
