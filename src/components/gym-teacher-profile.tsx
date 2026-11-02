"use client";

import {
  formatGymTeacherBodySize,
  formatGymTeacherField,
  formatGymTeacherYesNo,
  type GymTeacherProfile,
} from "@/lib/gym-teachers";

type GymTeacherProfileViewProps = {
  teacher: GymTeacherProfile;
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

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[minmax(0,11rem)_1fr] sm:gap-4">
      <dt className="text-sm font-semibold text-[var(--gym-muted)]">{label}</dt>
      <dd className="text-sm text-[var(--gym-ink)] whitespace-pre-wrap">{value}</dd>
    </div>
  );
}

export function GymTeacherProfileView({ teacher }: GymTeacherProfileViewProps) {
  return (
    <div className="gym-glass-card rounded-2xl p-5 sm:p-6">
      <p className="text-4xl" aria-hidden>🌮</p>
      <h2 className="mt-3 font-[family-name:var(--font-gym-display)] text-2xl font-bold uppercase tracking-tight text-[var(--gym-ink)]">
        {teacher.displayName}
      </h2>
      <p className="mt-1 text-sm text-[var(--gym-muted)]">Teacher application</p>

      <dl className="mt-6 flex flex-col gap-4">
        <SectionHeading>About you</SectionHeading>
        <ProfileRow label="Age" value={formatGymTeacherField(teacher.age)} />
        <ProfileRow
          label="Fat or skinny?"
          value={formatGymTeacherBodySize(teacher.bodySize)}
        />
        <ProfileRow label="Gender" value={formatGymTeacherField(teacher.gender)} />
        <ProfileRow
          label="Single?"
          value={formatGymTeacherYesNo(teacher.isSingle)}
        />
        <ProfileRow
          label="Has children?"
          value={formatGymTeacherYesNo(teacher.hasChildren)}
        />
        <ProfileRow
          label="Favorite food"
          value={formatGymTeacherField(teacher.favoriteFood)}
        />
        <ProfileRow
          label="Allergies"
          value={formatGymTeacherField(teacher.allergies)}
        />
        <ProfileRow
          label="Fun fact"
          value={formatGymTeacherField(teacher.funFact)}
        />

        <SectionHeading>Teaching</SectionHeading>
        <ProfileRow
          label="Years teaching"
          value={formatGymTeacherField(teacher.yearsTeaching)}
        />
        <ProfileRow
          label="Experience"
          value={formatGymTeacherField(teacher.experience)}
        />
        <ProfileRow
          label="Certifications"
          value={formatGymTeacherField(teacher.certifications)}
        />
        <ProfileRow
          label="Favorite exercise"
          value={formatGymTeacherField(teacher.favoriteExercise)}
        />
        <ProfileRow
          label="Availability"
          value={formatGymTeacherField(teacher.availability)}
        />
        <ProfileRow
          label="Why sign up?"
          value={formatGymTeacherField(teacher.signupReason)}
        />
        <ProfileRow
          label="Besides teaching"
          value={formatGymTeacherField(teacher.otherActivities)}
        />

        <SectionHeading>Contact and extras</SectionHeading>
        <ProfileRow label="Contact" value={formatGymTeacherField(teacher.contact)} />
        <ProfileRow
          label="City / area"
          value={formatGymTeacherField(teacher.cityOrArea)}
        />
        <ProfileRow
          label="Emergency contact"
          value={formatGymTeacherField(teacher.emergencyContact)}
        />
        <ProfileRow
          label="Social media"
          value={formatGymTeacherField(teacher.socialMedia)}
        />
        <ProfileRow
          label="How they heard"
          value={formatGymTeacherField(teacher.howHeard)}
        />
      </dl>
    </div>
  );
}
