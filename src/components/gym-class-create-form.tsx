"use client";

import {
  type GymClassChaosLevel,
  type GymClassCreateInput,
  type GymClassDungeonRoom,
  type GymClassSweatRating,
  type GymClassTacoBudget,
  type GymTeacherProfile,
} from "@/lib/gym-teachers";

type GymClassCreateFormProps = {
  value: GymClassCreateInput;
  onChange: (next: GymClassCreateInput) => void;
  teachers: GymTeacherProfile[];
  disabled?: boolean;
};

export function GymClassCreateForm({
  value,
  onChange,
  teachers,
  disabled,
}: GymClassCreateFormProps) {
  const patch = (partial: Partial<GymClassCreateInput>) =>
    onChange({ ...value, ...partial });

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--gym-ink)]">
        Class name
        <input
          className="gym-input"
          value={value.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="Kid Cardio Chaos"
          disabled={disabled}
          required
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--gym-ink)]">
        Teacher
        <select
          className="gym-input"
          value={value.teacherId}
          onChange={(e) => patch({ teacherId: e.target.value })}
          disabled={disabled || teachers.length === 0}
          required
        >
          <option value="">— Pick teacher —</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.displayName}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--gym-ink)]">
        Chaos level
        <select
          className="gym-input"
          value={value.chaosLevel}
          onChange={(e) =>
            patch({ chaosLevel: e.target.value as GymClassChaosLevel | "" })
          }
          disabled={disabled}
          required
        >
          <option value="">Pick chaos</option>
          <option value="calm">Calm</option>
          <option value="spicy">Spicy</option>
          <option value="butt_face_approved">Butt Face approved</option>
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--gym-ink)]">
        Official mascot
        <input
          className="gym-input"
          value={value.mascotCreature}
          onChange={(e) => patch({ mascotCreature: e.target.value })}
          placeholder="A wet raccoon in leg warmers"
          disabled={disabled}
          required
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--gym-ink)]">
        Sweat forecast
        <select
          className="gym-input"
          value={value.sweatRating}
          onChange={(e) =>
            patch({ sweatRating: e.target.value as GymClassSweatRating | "" })
          }
          disabled={disabled}
          required
        >
          <option value="">Pick sweat level</option>
          <option value="glitter">Glitter</option>
          <option value="normal">Normal</option>
          <option value="niagara">Niagara Falls</option>
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--gym-ink)]">
        Opening battle cry
        <input
          className="gym-input"
          value={value.battleCry}
          onChange={(e) => patch({ battleCry: e.target.value })}
          placeholder="FOR GLORY AND SNACKS"
          disabled={disabled}
          required
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--gym-ink)]">
        Forbidden exercise
        <input
          className="gym-input"
          value={value.forbiddenMove}
          onChange={(e) => patch({ forbiddenMove: e.target.value })}
          placeholder="The worm (never again)"
          disabled={disabled}
          required
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--gym-ink)]">
        Taco fund tier
        <select
          className="gym-input"
          value={value.tacoBudget}
          onChange={(e) =>
            patch({ tacoBudget: e.target.value as GymClassTacoBudget | "" })
          }
          disabled={disabled}
          required
        >
          <option value="">Pick taco tier</option>
          <option value="crumbs">Crumbs</option>
          <option value="standard">Standard</option>
          <option value="unlimited">Unlimited</option>
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--gym-ink)]">
        Dungeon room
        <select
          className="gym-input"
          value={value.dungeonRoom}
          onChange={(e) =>
            patch({ dungeonRoom: e.target.value as GymClassDungeonRoom | "" })
          }
          disabled={disabled}
          required
        >
          <option value="">Pick room</option>
          <option value="boiler_room">Boiler room</option>
          <option value="mirror_maze">Mirror maze</option>
          <option value="parking_lot">Parking lot</option>
          <option value="vending_alley">Vending alley</option>
        </select>
      </label>
    </div>
  );
}
