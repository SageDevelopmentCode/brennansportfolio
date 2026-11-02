import type { Metadata } from "next";
import { Nunito } from "next/font/google";

const nunito = Nunito({
  variable: "--font-family-calendar",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Home Week",
  description: "Family week calendar with color-coded schedules",
};

export default function FamilyCalendarLayout({
  children,
}: LayoutProps<"/family-calendar">) {
  return (
    <div
      className={`${nunito.variable} family-calendar-theme min-h-full font-[family-name:var(--font-family-calendar)]`}
    >
      {children}
    </div>
  );
}
