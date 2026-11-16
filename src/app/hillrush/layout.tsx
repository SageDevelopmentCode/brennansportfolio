import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Brennan's Hill Rush",
  description: "Climb. Flip. Don't bonk your head.",
};

export default function HillRushLayout({ children }: LayoutProps<"/hillrush">) {
  return (
    <div className="min-h-[100dvh]">{children}</div>
  );
}
