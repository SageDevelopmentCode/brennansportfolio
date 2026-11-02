import { AuthNav } from "@/components/auth-nav";
import { headers } from "next/headers";

export async function PathAwareHeader() {
  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname") ?? "";

  if (pathname === "/squad" || pathname.startsWith("/squad/")) {
    return null;
  }

  return (
    <header className="relative z-20 flex justify-end px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
      <AuthNav />
    </header>
  );
}
