import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rush Motors",
  description: "Sell the Hill Rush garage — same cars, same drawings, your lot.",
};

export default function DealershipLayout({ children }: LayoutProps<"/dealership">) {
  return <div className="dealership-theme min-h-full">{children}</div>;
}
