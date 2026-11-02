import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Squad Ping",
  description: "Secret base codes and live chat with your crew",
};

export default function SquadLayout({ children }: LayoutProps<"/squad">) {
  return <div className="squad-theme min-h-full">{children}</div>;
}
