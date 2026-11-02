"use client";

import type {
  GymTeacherBodySize,
  GymTeacherSignupInput,
} from "@/lib/gym-teachers";

type GymTeacherSignupFieldsProps = {
  value: GymTeacherSignupInput;
  onChange: (next: GymTeacherSignupInput) => void;
  disabled?: boolean;
};

function SectionHeading({ children }: { children: string }) {
  return (
    <h3
      className="border-t border-[var(--gym-border)] pt-4 text-xs font-bold uppercase tracking-widest text-[var(--gym-accent)] first:border-t-0 first:pt-0"
    >
      {children}
    </h3>
  );
}

function YesNoField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (next: boolean) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-semibold text-[var(--gym-ink)]">
        {label}
      </legend>
      <div className="flex flex-wrap gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--gym-ink)]">
          <input
            type="radio"
            name={label}
            checked={value === true}
            onChange={() => onChange(true)}
            className="accent-[var(--gym-accent)]"
          />
          Yes
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--gym-ink)]">
          <input
            type="radio"
            name={label}
            checked={value === false}
            onChange={() => onChange(false)}
            className="accent-[var(--gym-accent)]"
          />
          No
        </label>
      </div>
    </fieldset>
  );
}

export function GymTeacherSignupFields({
  value,
  onChange,
  disabled,
}: GymTeacherSignupFieldsProps) {
  const patch = (partial: Partial<GymTeacherSignupInput>) =>
    onChange({ ...value, ...partial });

  return (
    <div className="flex flex-col gap-4">
      <SectionHeading>About you</SectionHeading>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--gym-ink)]">
        Display name
        <input
          className="gym-input"
          value={value.displayName}
          onChange={(e) => patch({ displayName: e.target.value })}
          placeholder="Mr. Crunch"
          disabled={disabled}
          required
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--gym-ink)]">
        Age
        <input
          className="gym-input"
          type="number"
          min={16}
          max={99}
          value={value.age}
          onChange={(e) => patch({ age: e.target.value })}
          placeholder="32"
          disabled={disabled}
          required
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--gym-ink)]">
        Are you fat or skinny?
        <select
          className="gym-input"
          value={value.bodySize}
          onChange={(e) =>
            patch({ bodySize: e.target.value as GymTeacherBodySize | "" })
          }
          disabled={disabled}
          required
        >
          <option value="">Pick one</option>
          <option value="skinny">Skinny</option>
          <option value="average">Average</option>
          <option value="fat">Fat</option>
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--gym-ink)]">
        Gender
        <input
          className="gym-input"
          value={value.gender}
          onChange={(e) => patch({ gender: e.target.value })}
          placeholder="How you identify"
          disabled={disabled}
          required
        />
      </label>

      <YesNoField
        label="Are you single?"
        value={value.isSingle}
        onChange={(isSingle) => patch({ isSingle })}
      />

      <YesNoField
        label="Do you have children?"
        value={value.hasChildren}
        onChange={(hasChildren) => patch({ hasChildren })}
      />

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--gym-ink)]">
        Favorite food
        <input
          className="gym-input"
          value={value.favoriteFood}
          onChange={(e) => patch({ favoriteFood: e.target.value })}
          placeholder="Tacos, obviously"
          disabled={disabled}
          required
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--gym-ink)]">
        Allergies
        <input
          className="gym-input"
          value={value.allergies}
          onChange={(e) => patch({ allergies: e.target.value })}
          placeholder="None, or list them"
          disabled={disabled}
          required
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--gym-ink)]">
        Fun fact about yourself
        <textarea
          className="gym-input min-h-[72px] resize-y"
          value={value.funFact}
          onChange={(e) => patch({ funFact: e.target.value })}
          placeholder="I can deadlift a minivan"
          disabled={disabled}
          required
        />
      </label>

      <SectionHeading>Teaching</SectionHeading>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--gym-ink)]">
        Years of teaching
        <input
          className="gym-input"
          type="number"
          min={0}
          max={60}
          value={value.yearsTeaching}
          onChange={(e) => patch({ yearsTeaching: e.target.value })}
          placeholder="0"
          disabled={disabled}
          required
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--gym-ink)]">
        Experience
        <textarea
          className="gym-input min-h-[88px] resize-y"
          value={value.experience}
          onChange={(e) => patch({ experience: e.target.value })}
          placeholder="Where you taught, what you taught, chaos level"
          disabled={disabled}
          required
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--gym-ink)]">
        Certifications or training
        <textarea
          className="gym-input min-h-[72px] resize-y"
          value={value.certifications}
          onChange={(e) => patch({ certifications: e.target.value })}
          placeholder="CPR, yoga, screaming at kids gently"
          disabled={disabled}
          required
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--gym-ink)]">
        Favorite exercise or sport
        <input
          className="gym-input"
          value={value.favoriteExercise}
          onChange={(e) => patch({ favoriteExercise: e.target.value })}
          placeholder="Burpees (liar) or pickleball"
          disabled={disabled}
          required
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--gym-ink)]">
        When can you teach? (days / times)
        <textarea
          className="gym-input min-h-[72px] resize-y"
          value={value.availability}
          onChange={(e) => patch({ availability: e.target.value })}
          placeholder="Weekdays after 3, never before coffee"
          disabled={disabled}
          required
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--gym-ink)]">
        Why do you want to sign up?
        <textarea
          className="gym-input min-h-[72px] resize-y"
          value={value.signupReason}
          onChange={(e) => patch({ signupReason: e.target.value })}
          placeholder="Be honest. We respect honesty-ish."
          disabled={disabled}
          required
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--gym-ink)]">
        Anything else besides teaching?
        <textarea
          className="gym-input min-h-[72px] resize-y"
          value={value.otherActivities}
          onChange={(e) => patch({ otherActivities: e.target.value })}
          placeholder="Side hustle, nap champion, etc."
          disabled={disabled}
          required
        />
      </label>

      <SectionHeading>Contact and extras</SectionHeading>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--gym-ink)]">
        Phone or email
        <input
          className="gym-input"
          value={value.contact}
          onChange={(e) => patch({ contact: e.target.value })}
          placeholder="555-0100 or you@example.com"
          disabled={disabled}
          required
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--gym-ink)]">
        Where you live (city / area)
        <input
          className="gym-input"
          value={value.cityOrArea}
          onChange={(e) => patch({ cityOrArea: e.target.value })}
          placeholder="Suburb, planet, etc."
          disabled={disabled}
          required
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--gym-ink)]">
        Emergency contact
        <input
          className="gym-input"
          value={value.emergencyContact}
          onChange={(e) => patch({ emergencyContact: e.target.value })}
          placeholder="Name and number"
          disabled={disabled}
          required
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--gym-ink)]">
        Social media handle
        <input
          className="gym-input"
          value={value.socialMedia}
          onChange={(e) => patch({ socialMedia: e.target.value })}
          placeholder="@coachcrunch"
          disabled={disabled}
          required
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--gym-ink)]">
        How did you hear about Iron Desk?
        <input
          className="gym-input"
          value={value.howHeard}
          onChange={(e) => patch({ howHeard: e.target.value })}
          placeholder="Friend, flyer, dream"
          disabled={disabled}
          required
        />
      </label>
    </div>
  );
}
