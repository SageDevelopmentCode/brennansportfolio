import type { Metadata } from "next";
import { Nunito } from "next/font/google";

const nunito = Nunito({
  variable: "--font-allergies",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Allergy Plate",
    description: "Track food allergies, plan today's meals, and save your plate on this device",
};

export default function FoodAllergiesLayout({
  children,
}: LayoutProps<"/food-allergies">) {
  return (
    <div
      className={`${nunito.variable} allergies-theme min-h-full font-[family-name:var(--font-allergies)]`}
    >
      {children}
    </div>
  );
}
