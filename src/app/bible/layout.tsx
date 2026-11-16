import type { Metadata } from "next";
import { Source_Serif_4 } from "next/font/google";

const sourceSerif = Source_Serif_4({
  variable: "--font-bible",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Brennan's Bible Hub",
  description:
    "Read a chapter, keep today's verse, and memorize verses on this device",
};

export default function BibleLayout({ children }: LayoutProps<"/bible">) {
  return (
    <div
      className={`${sourceSerif.variable} bible-theme flex min-h-full flex-1 flex-col font-[family-name:var(--font-bible)]`}
    >
      {children}
    </div>
  );
}
