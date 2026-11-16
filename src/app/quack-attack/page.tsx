import { QuackAttackGameClient } from "@/components/quack-attack-game-client";

export default function QuackAttackPage() {
  return (
    <main className="fixed inset-0 h-[100dvh] w-full overflow-hidden">
      <QuackAttackGameClient />
    </main>
  );
}
