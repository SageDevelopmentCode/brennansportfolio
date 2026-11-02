import { DeliveryAppClient } from "@/components/delivery-app-client";
import Link from "next/link";

export default function DeliveryPage() {
  return (
    <main className="relative flex flex-1 flex-col gap-8 bg-gradient-to-b from-sky-200 via-amber-50 to-teal-100 px-4 py-8 text-stone-900 sm:px-8 sm:py-12">
      <div>
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-orange-300/60 bg-white/80 px-4 py-2 text-sm font-semibold text-orange-900 transition hover:bg-white"
        >
          ← All projects
        </Link>
      </div>

      <header className="max-w-3xl">
        <span className="inline-block rounded-full bg-orange-400/25 px-3 py-1 text-xs font-bold uppercase tracking-widest text-orange-900 ring-1 ring-orange-400/40">
          Delivery company
        </span>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-5xl font-bold leading-tight sm:text-6xl">
          Skate Drop
        </h1>
        <p className="mt-4 text-lg text-stone-700">
          Packages arrive only while you play this session. Assign idle couriers
          before 30 are waiting at the dock — faster animals finish trips sooner.
          Mythic couriers over $10,000 haul more packages and pay bonus cash.
        </p>
      </header>

      <DeliveryAppClient />
    </main>
  );
}
