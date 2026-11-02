import type { Metadata } from "next";
import { Oswald, Source_Sans_3 } from "next/font/google";

const oswald = Oswald({
  variable: "--font-gym-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-gym-body",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Iron Desk",
  description:
    "Run your gym from the front desk — families check in, you approve or deny",
};

export default function GymLayout({ children }: LayoutProps<"/gym">) {
  return (
    <div
      className={`${oswald.variable} ${sourceSans.variable} gym-theme min-h-full font-[family-name:var(--font-gym-body)]`}
    >
      {children}
    </div>
  );
}
