import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";

const dmSans = DM_Sans({
  variable: "--font-sign",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Sign Bridge",
  description:
    "Type English text and play ASL word signs and fingerspelling — accessibility practice tool",
};

export default function SignLayout({ children }: LayoutProps<"/sign">) {
  return (
    <div
      className={`${dmSans.variable} sign-theme min-h-full font-[family-name:var(--font-sign)]`}
    >
      {children}
    </div>
  );
}
