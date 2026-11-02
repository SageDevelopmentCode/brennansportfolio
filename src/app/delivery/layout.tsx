import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Skate Drop",
  description: "You own the delivery company. Hire skateboards by name.",
};

export default function DeliveryLayout({
  children,
}: LayoutProps<"/delivery">) {
  return <div className="min-h-full">{children}</div>;
}
