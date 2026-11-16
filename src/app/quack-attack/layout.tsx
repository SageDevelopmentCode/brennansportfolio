import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quack Attack",
  description: "Be a duck in sunglasses. Bonk a billion blobs. Learn absolutely nothing.",
};

export default function QuackAttackLayout({ children }: LayoutProps<"/quack-attack">) {
  return <div className="min-h-full">{children}</div>;
}
