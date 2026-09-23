import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";

const dmSans = DM_Sans({
  variable: "--font-roadtrip",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Open Road",
  description:
    "Plan road trips with a driving route and gas and grocery stops along the way",
};

export default function RoadtripLayout({ children }: LayoutProps<"/roadtrip">) {
  return (
    <div
      className={`${dmSans.variable} roadtrip-theme min-h-full font-[family-name:var(--font-roadtrip)]`}
    >
      {children}
    </div>
  );
}
