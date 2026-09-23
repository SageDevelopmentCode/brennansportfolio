import { WeatherUnitProvider } from "@/components/weather-unit-provider";
import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";

const dmSans = DM_Sans({
  variable: "--font-skyline",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Skyline",
  description: "Search cities, check the weather, and save your favorites",
};

export default function WeatherLayout({ children }: LayoutProps<"/weather">) {
  return (
    <div
      className={`${dmSans.variable} skyline-theme min-h-full font-[family-name:var(--font-skyline)]`}
    >
      <WeatherUnitProvider>{children}</WeatherUnitProvider>
    </div>
  );
}
