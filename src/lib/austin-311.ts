const AUSTIN_311_QUERY_URL =
  "https://data.austintexas.gov/api/v3/views/38mr-dwji/query.json";

export type Austin311GeoPoint = {
  type: "Point";
  coordinates: [number, number];
};

export type Austin311CountRow = {
  label: string;
  total: number;
};

export type Austin311MapPoint = {
  serviceRequestNumber: string;
  description: string;
  latitude: number;
  longitude: number;
};

export type Austin311DashboardData = {
  openCount: number;
  topTypes: Austin311CountRow[];
  statusMix: Austin311CountRow[];
  openByFiscalYear: Austin311CountRow[];
  mapPoints: Austin311MapPoint[];
  fetchedAt: string;
};

export type Austin311Request = {
  serviceRequestNumber: string;
  description: string;
  status: string;
  department: string;
  groupDescription: string;
  methodReceived: string;
  createdDate: string | null;
  statusChangeDate: string | null;
  closeDate: string | null;
  lastUpdateDate: string | null;
  fiscalYear: string | null;
  responseDays: number | null;
  srLocation: string | null;
  latitude: number | null;
  longitude: number | null;
};

type Austin311RequestRow = {
  service_request_sr_number: string;
  sr_description: string;
  sr_status: string;
  department: string;
  group_description: string;
  method_received: string;
  created_date: string | null;
  status_change_date: string | null;
  close_date: string | null;
  last_update_date: string | null;
  fiscal_year: string | null;
  response_days: string | null;
  sr_location: string | null;
  location: Austin311GeoPoint | null;
};

const OPEN_REQUEST_SELECT = `SELECT service_request_sr_number, sr_description, sr_status, department,
  group_description, method_received, created_date, status_change_date,
  close_date, last_update_date, fiscal_year, response_days, sr_location, location`;

export function formatAustin311Date(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/Chicago",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function escapeSoqlString(value: string): string {
  return value.replace(/'/g, "''");
}

function parseResponseDays(value: string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

function mapRequestRow(row: Austin311RequestRow): Austin311Request {
  let latitude: number | null = null;
  let longitude: number | null = null;
  const loc = row.location;
  if (loc?.coordinates && loc.coordinates.length >= 2) {
    const [lng, lat] = loc.coordinates;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      latitude = lat;
      longitude = lng;
    }
  }

  return {
    serviceRequestNumber: row.service_request_sr_number ?? "",
    description: row.sr_description ?? "",
    status: row.sr_status ?? "",
    department: row.department ?? "",
    groupDescription: row.group_description ?? "",
    methodReceived: row.method_received ?? "",
    createdDate: row.created_date,
    statusChangeDate: row.status_change_date,
    closeDate: row.close_date,
    lastUpdateDate: row.last_update_date,
    fiscalYear: row.fiscal_year,
    responseDays: parseResponseDays(row.response_days),
    srLocation: row.sr_location,
    latitude,
    longitude,
  };
}

function parseTotal(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function rowLabel(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "Unknown";
}

export async function queryAustin311<T extends Record<string, unknown>>(
  soql: string,
): Promise<T[]> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  const token = process.env.SOCRATA_APP_TOKEN;
  if (token) {
    headers["X-App-Token"] = token;
  }

  const response = await fetch(AUSTIN_311_QUERY_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ query: soql }),
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`Austin 311 API error: ${response.status}`);
  }

  const data = (await response.json()) as T[];
  return Array.isArray(data) ? data : [];
}

export async function getDashboardData(): Promise<Austin311DashboardData> {
  const [
    openCountRows,
    topTypeRows,
    statusRows,
    fiscalYearRows,
    locationRows,
  ] = await Promise.all([
    queryAustin311<{ total: string }>(
      "SELECT count(*) AS total WHERE sr_status = 'Open'",
    ),
    queryAustin311<{ sr_description: string; total: string }>(
      "SELECT sr_description, count(*) AS total GROUP BY sr_description ORDER BY total DESC LIMIT 10",
    ),
    queryAustin311<{ sr_status: string; total: string }>(
      "SELECT sr_status, count(*) AS total GROUP BY sr_status ORDER BY total DESC",
    ),
    queryAustin311<{ fiscal_year: string; total: string }>(
      "SELECT fiscal_year, count(*) AS total WHERE sr_status = 'Open' GROUP BY fiscal_year ORDER BY fiscal_year DESC LIMIT 8",
    ),
    queryAustin311<{
      service_request_sr_number: string;
      sr_description: string;
      location: Austin311GeoPoint | null;
    }>(
      "SELECT service_request_sr_number, sr_description, location WHERE sr_status = 'Open' AND location IS NOT NULL LIMIT 200",
    ),
  ]);

  const openCount = parseTotal(openCountRows[0]?.total);

  const topTypes: Austin311CountRow[] = topTypeRows.map((row) => ({
    label: rowLabel(row, ["sr_description"]),
    total: parseTotal(row.total),
  }));

  const statusMix: Austin311CountRow[] = statusRows.map((row) => ({
    label: rowLabel(row, ["sr_status"]),
    total: parseTotal(row.total),
  }));

  const openByFiscalYear: Austin311CountRow[] = fiscalYearRows
    .map((row) => ({
      label: rowLabel(row, ["fiscal_year"]),
      total: parseTotal(row.total),
    }))
    .reverse();

  const mapPoints: Austin311MapPoint[] = [];
  for (const row of locationRows) {
    const loc = row.location;
    if (!loc?.coordinates || loc.coordinates.length < 2) continue;
    const [lng, lat] = loc.coordinates;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    mapPoints.push({
      serviceRequestNumber: row.service_request_sr_number ?? "",
      description: row.sr_description ?? "Service request",
      latitude: lat,
      longitude: lng,
    });
  }

  return {
    openCount,
    topTypes,
    statusMix,
    openByFiscalYear,
    mapPoints,
    fetchedAt: new Date().toISOString(),
  };
}

export async function getOpenRequestLogs(
  limit = 50,
): Promise<Austin311Request[]> {
  const capped = Math.min(Math.max(1, limit), 100);
  const rows = await queryAustin311<Austin311RequestRow>(
    `${OPEN_REQUEST_SELECT} WHERE sr_status = 'Open' ORDER BY created_date DESC LIMIT ${capped}`,
  );
  return rows.map(mapRequestRow);
}

export async function getOpenRequestByNumber(
  srNumber: string,
): Promise<Austin311Request | null> {
  const trimmed = srNumber.trim();
  if (!trimmed) return null;

  const rows = await queryAustin311<Austin311RequestRow>(
    `${OPEN_REQUEST_SELECT} WHERE sr_status = 'Open' AND service_request_sr_number = '${escapeSoqlString(trimmed)}' LIMIT 1`,
  );
  const row = rows[0];
  return row ? mapRequestRow(row) : null;
}
