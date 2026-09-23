import type { Metadata } from "next";
import { Nunito } from "next/font/google";

const nunito = Nunito({
  variable: "--font-homework",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Homework Hub",
  description: "Track homework, chores, and savings goals",
};

export default function HomeworkLayout({ children }: LayoutProps<"/homework">) {
  return (
    <div
      className={`${nunito.variable} homework-theme min-h-full font-[family-name:var(--font-homework)]`}
    >
      {children}
    </div>
  );
}
