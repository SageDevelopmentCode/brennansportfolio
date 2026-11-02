import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hill Run",
  description: "Hill-climb racing — gas, brake, fuel, coins, garage upgrades, and endless stages.",
};

export default function HillClimbLayout({ children }: LayoutProps<"/hill-climb">) {
  return <div className="hill-climb-theme min-h-full">{children}</div>;
}
