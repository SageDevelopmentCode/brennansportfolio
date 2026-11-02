import { WORKER_DISPLAY_NAME } from "@/lib/shelter-worker-lines";

type ShelterDeathGaryProps = {
  line: string | null;
  visible: boolean;
};

export function ShelterDeathGary({ line, visible }: ShelterDeathGaryProps) {
  if (!visible) return null;

  return (
    <div className="shelter-death-gary" aria-hidden>
      <span className="shelter-death-gary-emoji">🥸</span>
      <p className="shelter-death-gary-name">{WORKER_DISPLAY_NAME}</p>
      {line && <p className="shelter-death-gary-line">&ldquo;{line}&rdquo;</p>}
    </div>
  );
}
