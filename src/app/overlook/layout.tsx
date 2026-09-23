import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Overlook Events",
  description: "Neighborhood events and RSVPs",
};

export default function OverlookLayout({ children }: LayoutProps<"/overlook">) {
  return children;
}
