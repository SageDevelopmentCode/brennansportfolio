const STORAGE_KEY = "rush-motors-staff-v1";

export type Employee = {
  id: string;
  name: string;
  role: string;
  createdAt: string;
};

export type StaffState = {
  employees: Employee[];
  assignByVehicleId: Record<string, string>;
};

export type EmployeeInput = {
  name: string;
  role: string;
};

export type EmployeeFieldErrors = Partial<Record<keyof EmployeeInput, string>>;

export function emptyStaff(): StaffState {
  return { employees: [], assignByVehicleId: {} };
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `staff-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeInput(input: EmployeeInput): EmployeeInput {
  return {
    name: input.name.trim(),
    role: input.role.trim(),
  };
}

export function validateEmployeeInput(input: EmployeeInput): EmployeeFieldErrors {
  const errors: EmployeeFieldErrors = {};
  const snapshot = normalizeInput(input);
  if (!snapshot.name) errors.name = "Name is required.";
  return errors;
}

export function loadStaff(): StaffState {
  if (typeof window === "undefined") return emptyStaff();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStaff();
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object") return emptyStaff();
    const record = data as { employees?: unknown; assignByVehicleId?: unknown };
    return coerceStaff(record.employees, record.assignByVehicleId);
  } catch {
    return emptyStaff();
  }
}

export function saveStaff(state: StaffState): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

function coerceStaff(employeesRaw: unknown, assignRaw: unknown): StaffState {
  const employees = coerceEmployees(employeesRaw);
  const ids = new Set(employees.map((e) => e.id));
  const assignByVehicleId: Record<string, string> = {};
  if (assignRaw && typeof assignRaw === "object" && !Array.isArray(assignRaw)) {
    for (const [vehicleId, employeeId] of Object.entries(assignRaw as Record<string, unknown>)) {
      if (typeof vehicleId !== "string" || typeof employeeId !== "string") continue;
      if (!ids.has(employeeId)) continue;
      assignByVehicleId[vehicleId] = employeeId;
    }
  }
  return { employees, assignByVehicleId };
}

function coerceEmployees(raw: unknown): Employee[] {
  if (!Array.isArray(raw)) return [];
  const out: Employee[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (typeof row.id !== "string") continue;
    if (typeof row.name !== "string" || !row.name.trim()) continue;
    out.push({
      id: row.id,
      name: row.name.trim(),
      role: typeof row.role === "string" ? row.role.trim() : "",
      createdAt: typeof row.createdAt === "string" ? row.createdAt : nowIso(),
    });
  }
  return out;
}

export function addEmployee(
  state: StaffState,
  input: EmployeeInput,
): { ok: true; state: StaffState; employee: Employee } | { ok: false; errors: EmployeeFieldErrors } {
  const errors = validateEmployeeInput(input);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  const snapshot = normalizeInput(input);
  const employee: Employee = {
    id: newId(),
    name: snapshot.name,
    role: snapshot.role,
    createdAt: nowIso(),
  };
  return {
    ok: true,
    state: { ...state, employees: [...state.employees, employee] },
    employee,
  };
}

export function removeEmployee(state: StaffState, employeeId: string): StaffState {
  const employees = state.employees.filter((e) => e.id !== employeeId);
  const assignByVehicleId: Record<string, string> = {};
  for (const [vehicleId, assignedId] of Object.entries(state.assignByVehicleId)) {
    if (assignedId !== employeeId) assignByVehicleId[vehicleId] = assignedId;
  }
  return { employees, assignByVehicleId };
}

export function assignEmployeeToVehicle(
  state: StaffState,
  vehicleId: string,
  employeeId: string | null,
): StaffState {
  const assignByVehicleId = { ...state.assignByVehicleId };
  if (employeeId === null || employeeId === "") {
    delete assignByVehicleId[vehicleId];
    return { ...state, assignByVehicleId };
  }
  if (!state.employees.some((e) => e.id === employeeId)) {
    return state;
  }
  assignByVehicleId[vehicleId] = employeeId;
  return { ...state, assignByVehicleId };
}

export function employeeForVehicle(
  state: StaffState,
  vehicleId: string,
): Employee | null {
  const id = state.assignByVehicleId[vehicleId];
  if (!id) return null;
  return state.employees.find((e) => e.id === id) ?? null;
}

export function vehiclesForEmployee(
  state: StaffState,
  employeeId: string,
): string[] {
  return Object.entries(state.assignByVehicleId)
    .filter(([, id]) => id === employeeId)
    .map(([vehicleId]) => vehicleId);
}
