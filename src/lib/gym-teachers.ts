import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getGymCheckInRoster,
  isChildOnFloor,
  type GymCheckInChild,
  type GymCheckInRequest,
} from "@/lib/gym";

export type GymTeacher = {
  id: string;
  displayName: string;
  createdAt: string;
};

export type GymTeacherProfile = GymTeacher & {
  experience: string | null;
  age: number | null;
  bodySize: GymTeacherBodySize | null;
  gender: string | null;
  signupReason: string | null;
  otherActivities: string | null;
  isSingle: boolean | null;
  hasChildren: boolean | null;
  favoriteFood: string | null;
  contact: string | null;
  cityOrArea: string | null;
  certifications: string | null;
  availability: string | null;
  emergencyContact: string | null;
  funFact: string | null;
  howHeard: string | null;
  socialMedia: string | null;
  allergies: string | null;
  favoriteExercise: string | null;
  yearsTeaching: number | null;
};

export function formatGymTeacherBodySize(
  bodySize: GymTeacherBodySize | null | string,
): string {
  if (!bodySize) return "Not provided";
  switch (bodySize) {
    case "skinny":
      return "Skinny";
    case "average":
      return "Average";
    case "fat":
      return "Fat";
    default:
      return String(bodySize);
  }
}

export function formatGymTeacherYesNo(value: boolean | null): string {
  if (value === null) return "Not provided";
  return value ? "Yes" : "No";
}

export function formatGymTeacherField(value: string | number | null): string {
  if (value === null || value === "") return "Not provided";
  return String(value);
}

export type GymClassChaosLevel = "calm" | "spicy" | "butt_face_approved";
export type GymClassSweatRating = "glitter" | "normal" | "niagara";
export type GymClassTacoBudget = "crumbs" | "standard" | "unlimited";
export type GymClassDungeonRoom =
  | "boiler_room"
  | "mirror_maze"
  | "parking_lot"
  | "vending_alley";

export type GymClassOwnerPicks = {
  chaosLevel: GymClassChaosLevel | null;
  mascotCreature: string | null;
  sweatRating: GymClassSweatRating | null;
  battleCry: string | null;
  forbiddenMove: string | null;
  tacoBudget: GymClassTacoBudget | null;
  dungeonRoom: GymClassDungeonRoom | null;
};

export type GymClass = {
  id: string;
  name: string;
  teacherId: string | null;
  createdAt: string;
} & GymClassOwnerPicks;

export type GymClassCreateInput = {
  name: string;
  teacherId: string;
  chaosLevel: GymClassChaosLevel | "";
  mascotCreature: string;
  sweatRating: GymClassSweatRating | "";
  battleCry: string;
  forbiddenMove: string;
  tacoBudget: GymClassTacoBudget | "";
  dungeonRoom: GymClassDungeonRoom | "";
};

export type CreateGymClassErrorCode =
  | "invalid_name"
  | "invalid_teacher"
  | "invalid_class_profile"
  | "incomplete_form"
  | "unknown";

export function emptyGymClassCreateInput(): GymClassCreateInput {
  return {
    name: "",
    teacherId: "",
    chaosLevel: "",
    mascotCreature: "",
    sweatRating: "",
    battleCry: "",
    forbiddenMove: "",
    tacoBudget: "",
    dungeonRoom: "",
  };
}

export function validateGymClassCreateInput(
  input: GymClassCreateInput,
): CreateGymClassErrorCode | null {
  if (!input.name.trim()) return "invalid_name";
  if (!input.teacherId) return "invalid_teacher";
  if (!input.chaosLevel || !input.sweatRating || !input.tacoBudget || !input.dungeonRoom) {
    return "incomplete_form";
  }
  if (
    !input.mascotCreature.trim() ||
    !input.battleCry.trim() ||
    !input.forbiddenMove.trim()
  ) {
    return "incomplete_form";
  }
  return null;
}

export function createGymClassErrorMessage(code: CreateGymClassErrorCode): string {
  switch (code) {
    case "invalid_name":
      return "Enter a class name.";
    case "invalid_teacher":
      return "Pick a teacher for this class.";
    case "invalid_class_profile":
    case "incomplete_form":
      return "Fill out every class setting before creating.";
    default:
      return "Could not create class. Apply gym migrations and try again.";
  }
}

export function formatGymClassChaosLevel(
  value: GymClassChaosLevel | null,
): string {
  if (!value) return "Not set";
  switch (value) {
    case "calm":
      return "Calm";
    case "spicy":
      return "Spicy";
    case "butt_face_approved":
      return "Butt Face approved";
  }
}

export function formatGymClassSweatRating(
  value: GymClassSweatRating | null,
): string {
  if (!value) return "Not set";
  switch (value) {
    case "glitter":
      return "Glitter";
    case "normal":
      return "Normal";
    case "niagara":
      return "Niagara Falls";
  }
}

export function formatGymClassTacoBudget(
  value: GymClassTacoBudget | null,
): string {
  if (!value) return "Not set";
  switch (value) {
    case "crumbs":
      return "Crumbs";
    case "standard":
      return "Standard";
    case "unlimited":
      return "Unlimited";
  }
}

export function formatGymClassDungeonRoom(
  value: GymClassDungeonRoom | null,
): string {
  if (!value) return "Not set";
  switch (value) {
    case "boiler_room":
      return "Boiler room";
    case "mirror_maze":
      return "Mirror maze";
    case "parking_lot":
      return "Parking lot";
    case "vending_alley":
      return "Vending alley";
  }
}

export type GymEnrolledChild = GymCheckInChild & {
  familyName: string;
  requestId: string;
};

export type GymClassWithRoster = GymClass & {
  teacherName: string | null;
  enrolledChildren: GymEnrolledChild[];
};

export type EnrollableChild = GymEnrolledChild;

export type GymTeacherBodySize = "skinny" | "average" | "fat";

export type GymTeacherSignupInput = {
  displayName: string;
  experience: string;
  age: string;
  bodySize: GymTeacherBodySize | "";
  gender: string;
  signupReason: string;
  otherActivities: string;
  isSingle: boolean | null;
  hasChildren: boolean | null;
  favoriteFood: string;
  contact: string;
  cityOrArea: string;
  certifications: string;
  availability: string;
  emergencyContact: string;
  funFact: string;
  howHeard: string;
  socialMedia: string;
  allergies: string;
  favoriteExercise: string;
  yearsTeaching: string;
};

export type RegisterGymTeacherErrorCode =
  | "invalid_name"
  | "invalid_age"
  | "invalid_years_teaching"
  | "invalid_body_size"
  | "invalid_profile"
  | "incomplete_form"
  | "unknown";

export function emptyGymTeacherSignupInput(): GymTeacherSignupInput {
  return {
    displayName: "",
    experience: "",
    age: "",
    bodySize: "",
    gender: "",
    signupReason: "",
    otherActivities: "",
    isSingle: null,
    hasChildren: null,
    favoriteFood: "",
    contact: "",
    cityOrArea: "",
    certifications: "",
    availability: "",
    emergencyContact: "",
    funFact: "",
    howHeard: "",
    socialMedia: "",
    allergies: "",
    favoriteExercise: "",
    yearsTeaching: "",
  };
}

export function validateGymTeacherSignupInput(
  input: GymTeacherSignupInput,
): RegisterGymTeacherErrorCode | null {
  if (!input.displayName.trim()) return "invalid_name";
  if (!input.experience.trim()) return "incomplete_form";
  const age = Number(input.age);
  if (!Number.isInteger(age) || age < 16 || age > 99) return "invalid_age";
  if (!input.bodySize) return "invalid_body_size";
  if (!input.gender.trim()) return "incomplete_form";
  if (!input.signupReason.trim()) return "incomplete_form";
  if (!input.otherActivities.trim()) return "incomplete_form";
  if (input.isSingle === null || input.hasChildren === null) {
    return "incomplete_form";
  }
  if (!input.favoriteFood.trim()) return "incomplete_form";
  if (!input.contact.trim()) return "incomplete_form";
  if (!input.cityOrArea.trim()) return "incomplete_form";
  if (!input.certifications.trim()) return "incomplete_form";
  if (!input.availability.trim()) return "incomplete_form";
  if (!input.emergencyContact.trim()) return "incomplete_form";
  if (!input.funFact.trim()) return "incomplete_form";
  if (!input.howHeard.trim()) return "incomplete_form";
  if (!input.socialMedia.trim()) return "incomplete_form";
  if (!input.allergies.trim()) return "incomplete_form";
  if (!input.favoriteExercise.trim()) return "incomplete_form";
  const years = Number(input.yearsTeaching);
  if (!Number.isInteger(years) || years < 0 || years > 60) {
    return "invalid_years_teaching";
  }
  return null;
}

export function registerGymTeacherErrorMessage(
  code: RegisterGymTeacherErrorCode,
): string {
  switch (code) {
    case "invalid_name":
      return "Enter a display name.";
    case "invalid_age":
      return "Age must be a whole number from 16 to 99.";
    case "invalid_years_teaching":
      return "Years teaching must be a whole number from 0 to 60.";
    case "invalid_body_size":
      return "Pick skinny, average, or fat.";
    case "invalid_profile":
    case "incomplete_form":
      return "Fill out every question before signing up.";
    default:
      return "Could not sign up. Apply gym migrations and try again.";
  }
}

type TeacherRow = {
  id: string;
  display_name: string;
  created_at: string;
  experience?: string | null;
  age?: number | null;
  body_size?: string | null;
  gender?: string | null;
  signup_reason?: string | null;
  other_activities?: string | null;
  is_single?: boolean | null;
  has_children?: boolean | null;
  favorite_food?: string | null;
  contact?: string | null;
  city_or_area?: string | null;
  certifications?: string | null;
  availability?: string | null;
  emergency_contact?: string | null;
  fun_fact?: string | null;
  how_heard?: string | null;
  social_media?: string | null;
  allergies?: string | null;
  favorite_exercise?: string | null;
  years_teaching?: number | null;
};

function parseBodySize(raw: string | null | undefined): GymTeacherBodySize | null {
  if (!raw) return null;
  const v = raw.toLowerCase();
  if (v === "skinny" || v === "average" || v === "fat") return v;
  return null;
}

function toTeacherProfile(row: TeacherRow): GymTeacherProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    createdAt: row.created_at,
    experience: row.experience ?? null,
    age: row.age ?? null,
    bodySize: parseBodySize(row.body_size),
    gender: row.gender ?? null,
    signupReason: row.signup_reason ?? null,
    otherActivities: row.other_activities ?? null,
    isSingle: row.is_single ?? null,
    hasChildren: row.has_children ?? null,
    favoriteFood: row.favorite_food ?? null,
    contact: row.contact ?? null,
    cityOrArea: row.city_or_area ?? null,
    certifications: row.certifications ?? null,
    availability: row.availability ?? null,
    emergencyContact: row.emergency_contact ?? null,
    funFact: row.fun_fact ?? null,
    howHeard: row.how_heard ?? null,
    socialMedia: row.social_media ?? null,
    allergies: row.allergies ?? null,
    favoriteExercise: row.favorite_exercise ?? null,
    yearsTeaching: row.years_teaching ?? null,
  };
}

type ClassRow = {
  id: string;
  name: string;
  teacher_id: string | null;
  created_at: string;
  chaos_level?: string | null;
  mascot_creature?: string | null;
  sweat_rating?: string | null;
  battle_cry?: string | null;
  forbidden_move?: string | null;
  taco_budget?: string | null;
  dungeon_room?: string | null;
};

function parseClassEnum<T extends string>(
  raw: string | null | undefined,
  allowed: readonly T[],
): T | null {
  if (!raw) return null;
  const v = raw.toLowerCase() as T;
  return allowed.includes(v) ? v : null;
}

const CHAOS_LEVELS: GymClassChaosLevel[] = [
  "calm",
  "spicy",
  "butt_face_approved",
];
const SWEAT_RATINGS: GymClassSweatRating[] = ["glitter", "normal", "niagara"];
const TACO_BUDGETS: GymClassTacoBudget[] = ["crumbs", "standard", "unlimited"];
const DUNGEON_ROOMS: GymClassDungeonRoom[] = [
  "boiler_room",
  "mirror_maze",
  "parking_lot",
  "vending_alley",
];

type EnrollmentRow = {
  class_id: string;
  child_id: string;
};

function toClass(row: ClassRow): GymClass {
  return {
    id: row.id,
    name: row.name,
    teacherId: row.teacher_id,
    createdAt: row.created_at,
    chaosLevel: parseClassEnum(row.chaos_level, CHAOS_LEVELS),
    mascotCreature: row.mascot_creature ?? null,
    sweatRating: parseClassEnum(row.sweat_rating, SWEAT_RATINGS),
    battleCry: row.battle_cry ?? null,
    forbiddenMove: row.forbidden_move ?? null,
    tacoBudget: parseClassEnum(row.taco_budget, TACO_BUDGETS),
    dungeonRoom: parseClassEnum(row.dungeon_room, DUNGEON_ROOMS),
  };
}

export async function registerGymTeacher(
  supabase: SupabaseClient,
  input: GymTeacherSignupInput,
): Promise<
  | { ok: true; teacher: GymTeacher }
  | { ok: false; code: RegisterGymTeacherErrorCode }
> {
  const clientCode = validateGymTeacherSignupInput(input);
  if (clientCode) {
    return { ok: false, code: clientCode };
  }

  const { data, error } = await supabase.rpc("gym_register_teacher", {
    p_display_name: input.displayName.trim(),
    p_experience: input.experience.trim(),
    p_age: Number(input.age),
    p_body_size: input.bodySize,
    p_gender: input.gender.trim(),
    p_signup_reason: input.signupReason.trim(),
    p_other_activities: input.otherActivities.trim(),
    p_is_single: input.isSingle,
    p_has_children: input.hasChildren,
    p_favorite_food: input.favoriteFood.trim(),
    p_contact: input.contact.trim(),
    p_city_or_area: input.cityOrArea.trim(),
    p_certifications: input.certifications.trim(),
    p_availability: input.availability.trim(),
    p_emergency_contact: input.emergencyContact.trim(),
    p_fun_fact: input.funFact.trim(),
    p_how_heard: input.howHeard.trim(),
    p_social_media: input.socialMedia.trim(),
    p_allergies: input.allergies.trim(),
    p_favorite_exercise: input.favoriteExercise.trim(),
    p_years_teaching: Number(input.yearsTeaching),
  });
  if (error) throw error;

  const payload = data as {
    ok?: boolean;
    code?: string;
    teacher_id?: string;
    display_name?: string;
  };

  if (payload?.ok && payload.teacher_id && payload.display_name) {
    return {
      ok: true,
      teacher: {
        id: payload.teacher_id,
        displayName: payload.display_name,
        createdAt: new Date().toISOString(),
      },
    };
  }

  const code = payload?.code;
  if (
    code === "invalid_name" ||
    code === "invalid_age" ||
    code === "invalid_years_teaching" ||
    code === "invalid_body_size" ||
    code === "invalid_profile"
  ) {
    return { ok: false, code };
  }
  return { ok: false, code: "unknown" };
}

const GYM_TEACHER_SELECT =
  "id, display_name, created_at, experience, age, body_size, gender, signup_reason, other_activities, is_single, has_children, favorite_food, contact, city_or_area, certifications, availability, emergency_contact, fun_fact, how_heard, social_media, allergies, favorite_exercise, years_teaching";

export async function listGymTeachers(
  supabase: SupabaseClient,
): Promise<GymTeacherProfile[]> {
  const { data, error } = await supabase
    .from("gym_teachers")
    .select(GYM_TEACHER_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => toTeacherProfile(row as TeacherRow));
}

const GYM_CLASS_SELECT =
  "id, name, teacher_id, created_at, chaos_level, mascot_creature, sweat_rating, battle_cry, forbidden_move, taco_budget, dungeon_room";

export async function createGymClass(
  supabase: SupabaseClient,
  input: GymClassCreateInput,
): Promise<
  | { ok: true; class: GymClass }
  | { ok: false; code: CreateGymClassErrorCode }
> {
  const clientCode = validateGymClassCreateInput(input);
  if (clientCode) {
    return { ok: false, code: clientCode };
  }

  const { data, error } = await supabase.rpc("gym_create_class", {
    p_name: input.name.trim(),
    p_teacher_id: input.teacherId,
    p_chaos_level: input.chaosLevel,
    p_mascot_creature: input.mascotCreature.trim(),
    p_sweat_rating: input.sweatRating,
    p_battle_cry: input.battleCry.trim(),
    p_forbidden_move: input.forbiddenMove.trim(),
    p_taco_budget: input.tacoBudget,
    p_dungeon_room: input.dungeonRoom,
  });
  if (error) throw error;

  const payload = data as {
    ok?: boolean;
    code?: string;
    class_id?: string;
    name?: string;
  };

  if (payload?.ok && payload.class_id && payload.name) {
    return {
      ok: true,
      class: {
        id: payload.class_id,
        name: payload.name,
        teacherId: input.teacherId,
        createdAt: new Date().toISOString(),
        chaosLevel: input.chaosLevel as GymClassChaosLevel,
        mascotCreature: input.mascotCreature.trim(),
        sweatRating: input.sweatRating as GymClassSweatRating,
        battleCry: input.battleCry.trim(),
        forbiddenMove: input.forbiddenMove.trim(),
        tacoBudget: input.tacoBudget as GymClassTacoBudget,
        dungeonRoom: input.dungeonRoom as GymClassDungeonRoom,
      },
    };
  }

  const code = payload?.code;
  if (
    code === "invalid_name" ||
    code === "invalid_teacher" ||
    code === "invalid_class_profile"
  ) {
    return { ok: false, code };
  }
  return { ok: false, code: "unknown" };
}

export async function assignClassTeacher(
  supabase: SupabaseClient,
  classId: string,
  teacherId: string,
): Promise<
  | { ok: true }
  | { ok: false; code: "class_not_found" | "teacher_not_found" | "unknown" }
> {
  const { data, error } = await supabase.rpc("gym_assign_class_teacher", {
    p_class_id: classId,
    p_teacher_id: teacherId,
  });
  if (error) throw error;

  const payload = data as { ok?: boolean; code?: string };
  if (payload?.ok) return { ok: true };

  const code = payload?.code;
  if (code === "class_not_found" || code === "teacher_not_found") {
    return { ok: false, code };
  }
  return { ok: false, code: "unknown" };
}

export async function setClassEnrollments(
  supabase: SupabaseClient,
  classId: string,
  childIds: string[],
): Promise<
  | { ok: true }
  | { ok: false; code: "class_not_found" | "invalid_child" | "unknown" }
> {
  const { data, error } = await supabase.rpc("gym_set_class_enrollments", {
    p_class_id: classId,
    p_child_ids: childIds,
  });
  if (error) throw error;

  const payload = data as { ok?: boolean; code?: string };
  if (payload?.ok) return { ok: true };

  const code = payload?.code;
  if (code === "class_not_found" || code === "invalid_child") {
    return { ok: false, code };
  }
  return { ok: false, code: "unknown" };
}

export async function listSimulatableFamilies(
  supabase: SupabaseClient,
): Promise<GymCheckInRequest[]> {
  const roster = await getGymCheckInRoster(supabase);
  return roster.filter((r) => r.status === "approved");
}

export function listEnrollableChildren(
  families: GymCheckInRequest[],
): EnrollableChild[] {
  const out: EnrollableChild[] = [];
  for (const family of families) {
    if (family.status !== "approved") continue;
    for (const child of family.children) {
      if (!isChildOnFloor(child)) continue;
      out.push({
        ...child,
        familyName: family.familyName,
        requestId: family.id,
      });
    }
  }
  return out.sort((a, b) =>
    `${a.familyName}-${a.name}`.localeCompare(`${b.familyName}-${b.name}`),
  );
}

export async function listGymClassesWithRoster(
  supabase: SupabaseClient,
): Promise<GymClassWithRoster[]> {
  const [classesRes, teachers, enrollmentsRes, families] = await Promise.all([
    supabase
      .from("gym_classes")
      .select(GYM_CLASS_SELECT)
      .order("created_at", { ascending: false }),
    listGymTeachers(supabase),
    supabase.from("gym_class_enrollments").select("class_id, child_id"),
    listSimulatableFamilies(supabase),
  ]);

  if (classesRes.error) throw classesRes.error;
  if (enrollmentsRes.error) throw enrollmentsRes.error;

  const teacherById = new Map(teachers.map((t) => [t.id, t.displayName]));
  const childById = new Map(
    listEnrollableChildren(families).map((c) => [c.id, c]),
  );
  const enrollmentsByClass = new Map<string, string[]>();
  for (const row of enrollmentsRes.data ?? []) {
    const e = row as EnrollmentRow;
    const list = enrollmentsByClass.get(e.class_id) ?? [];
    list.push(e.child_id);
    enrollmentsByClass.set(e.class_id, list);
  }

  return (classesRes.data ?? []).map((row) => {
    const cls = toClass(row as ClassRow);
    const childIds = enrollmentsByClass.get(cls.id) ?? [];
    const enrolledChildren = childIds
      .map((id) => childById.get(id))
      .filter((c): c is EnrollableChild => c !== undefined);

    return {
      ...cls,
      teacherName: cls.teacherId ? teacherById.get(cls.teacherId) ?? null : null,
      enrolledChildren,
    };
  });
}

export async function getTeacherClasses(
  supabase: SupabaseClient,
  teacherId: string,
): Promise<GymClassWithRoster[]> {
  const all = await listGymClassesWithRoster(supabase);
  return all.filter((c) => c.teacherId === teacherId);
}
