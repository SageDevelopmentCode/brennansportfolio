export type EventFormData = {
  name: string;
  theme: string;
  location: string;
  description: string;
  date: string;
  time: string;
  host: string;
  foods: string;
};

export const inputClassName =
  "rounded-xl border-2 border-accent-purple/20 bg-white/80 px-3 py-2.5 text-base text-foreground outline-none transition focus:border-accent-purple focus:ring-2 focus:ring-accent-purple/20";

type EventFormFieldsProps = {
  form: EventFormData;
  onFieldChange: <K extends keyof EventFormData>(
    field: K,
    value: EventFormData[K],
  ) => void;
  idPrefix?: string;
};

function todayDateValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function EventFormFields({
  form,
  onFieldChange,
  idPrefix = "event",
}: EventFormFieldsProps) {
  const minDate = todayDateValue();

  return (
    <>
      <label
        htmlFor={`${idPrefix}-name`}
        className="flex flex-col gap-1.5 text-sm font-medium text-foreground/80"
      >
        Event Name
        <input
          id={`${idPrefix}-name`}
          type="text"
          required
          placeholder="Block party, game night..."
          value={form.name}
          onChange={(e) => onFieldChange("name", e.target.value)}
          className={inputClassName}
        />
      </label>

      <label
        htmlFor={`${idPrefix}-theme`}
        className="flex flex-col gap-1.5 text-sm font-medium text-foreground/80"
      >
        Theme
        <input
          id={`${idPrefix}-theme`}
          type="text"
          placeholder="Halloween, Luau, Sports day..."
          value={form.theme}
          onChange={(e) => onFieldChange("theme", e.target.value)}
          className={inputClassName}
        />
      </label>

      <label
        htmlFor={`${idPrefix}-location`}
        className="flex flex-col gap-1.5 text-sm font-medium text-foreground/80"
      >
        Location
        <input
          id={`${idPrefix}-location`}
          type="text"
          placeholder="Park, community center..."
          value={form.location}
          onChange={(e) => onFieldChange("location", e.target.value)}
          className={inputClassName}
        />
      </label>

      <label
        htmlFor={`${idPrefix}-description`}
        className="flex flex-col gap-1.5 text-sm font-medium text-foreground/80"
      >
        Description
        <textarea
          id={`${idPrefix}-description`}
          rows={3}
          placeholder="What should people know?"
          value={form.description}
          onChange={(e) => onFieldChange("description", e.target.value)}
          className={inputClassName}
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label
          htmlFor={`${idPrefix}-date`}
          className="flex flex-col gap-1.5 text-sm font-medium text-foreground/80"
        >
          Date
          <input
            id={`${idPrefix}-date`}
            type="date"
            required
            min={minDate}
            value={form.date}
            onChange={(e) => onFieldChange("date", e.target.value)}
            className={inputClassName}
          />
        </label>

        <label
          htmlFor={`${idPrefix}-time`}
          className="flex flex-col gap-1.5 text-sm font-medium text-foreground/80"
        >
          Time
          <input
            id={`${idPrefix}-time`}
            type="time"
            required
            value={form.time}
            onChange={(e) => onFieldChange("time", e.target.value)}
            className={inputClassName}
          />
        </label>
      </div>

      <label
        htmlFor={`${idPrefix}-host`}
        className="flex flex-col gap-1.5 text-sm font-medium text-foreground/80"
      >
        Host
        <input
          id={`${idPrefix}-host`}
          type="text"
          placeholder="Who's organizing?"
          value={form.host}
          onChange={(e) => onFieldChange("host", e.target.value)}
          className={inputClassName}
        />
      </label>

      <label
        htmlFor={`${idPrefix}-foods`}
        className="flex flex-col gap-1.5 text-sm font-medium text-foreground/80"
      >
        Foods
        <textarea
          id={`${idPrefix}-foods`}
          rows={2}
          placeholder="Pizza, hot dogs, chips..."
          value={form.foods}
          onChange={(e) => onFieldChange("foods", e.target.value)}
          className={inputClassName}
        />
      </label>
    </>
  );
}
