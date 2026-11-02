import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";

const dmSans = DM_Sans({
  variable: "--font-austin311",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "City Calls",
  description:
    "Live Austin Transportation & Public Works 311 service requests — charts and map from open data",
};

export default function Austin311Layout({
  children,
}: LayoutProps<"/austin-311">) {
  return (
    <div
      className={`${dmSans.variable} austin311-theme min-h-full font-[family-name:var(--font-austin311)]`}
    >
      {children}
    </div>
  );
}
