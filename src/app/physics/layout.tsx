import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";

const ibmPlex = IBM_Plex_Sans({
  variable: "--font-physics",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Ramp Lab",
  description:
    "Roll a ball down an adjustable ramp — change angle, friction, length, and ball material",
};

export default function PhysicsLayout({ children }: LayoutProps<"/physics">) {
  return (
    <div
      className={`${ibmPlex.variable} physics-theme min-h-full font-[family-name:var(--font-physics)]`}
    >
      {children}
    </div>
  );
}
