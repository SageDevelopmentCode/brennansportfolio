import type { Metadata } from "next";
import { Nunito } from "next/font/google";

const nunito = Nunito({
  variable: "--font-shelter",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Paw Shelter",
  description:
    "Ask if your dream pet is available — sign the waiver or face game over",
};

export default function ShelterLayout({ children }: LayoutProps<"/shelter">) {
  return (
    <div
      className={`${nunito.variable} shelter-theme min-h-full font-[family-name:var(--font-shelter)]`}
    >
      {children}
    </div>
  );
}
