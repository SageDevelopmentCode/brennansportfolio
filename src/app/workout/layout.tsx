import type { Metadata } from "next";
import { Oswald } from "next/font/google";

const oswald = Oswald({
  variable: "--font-workout",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Rep Rack",
  description: "Workout templates, stopwatch, and session history",
};

export default function WorkoutLayout({ children }: LayoutProps<"/workout">) {
  return (
    <div
      className={`${oswald.variable} workout-theme min-h-full font-[family-name:var(--font-workout)]`}
    >
      {children}
    </div>
  );
}
