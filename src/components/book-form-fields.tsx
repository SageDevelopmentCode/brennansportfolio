export type BookFormData = {
  name: string;
  score: string;
  pages: string;
  series: boolean;
};

type BookFormFieldsProps = {
  form: BookFormData;
  onFieldChange: <K extends keyof BookFormData>(
    field: K,
    value: BookFormData[K],
  ) => void;
  idPrefix?: string;
};

export function BookFormFields({
  form,
  onFieldChange,
  idPrefix = "book",
}: BookFormFieldsProps) {
  return (
    <>
      <label
        htmlFor={`${idPrefix}-name`}
        className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--books-ink)]"
      >
        Book Name
        <input
          id={`${idPrefix}-name`}
          type="text"
          required
          placeholder="Harry Potter, The Hobbit..."
          value={form.name}
          onChange={(e) => onFieldChange("name", e.target.value)}
          className="book-input"
        />
      </label>

      <label
        htmlFor={`${idPrefix}-score`}
        className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--books-ink)]"
      >
        Score (0–10)
        <input
          id={`${idPrefix}-score`}
          type="number"
          min={0}
          max={10}
          step={0.5}
          placeholder="9.5"
          value={form.score}
          onChange={(e) => onFieldChange("score", e.target.value)}
          className="book-input"
        />
      </label>

      <label
        htmlFor={`${idPrefix}-pages`}
        className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--books-ink)]"
      >
        Pages
        <input
          id={`${idPrefix}-pages`}
          type="number"
          min={1}
          placeholder="320"
          value={form.pages}
          onChange={(e) => onFieldChange("pages", e.target.value)}
          className="book-input"
        />
      </label>

      <label
        htmlFor={`${idPrefix}-series`}
        className="flex items-center gap-3 text-sm font-semibold text-[var(--books-ink)]"
      >
        <input
          id={`${idPrefix}-series`}
          type="checkbox"
          checked={form.series}
          onChange={(e) => onFieldChange("series", e.target.checked)}
          className="h-5 w-5 rounded border-2 border-indigo-300 accent-indigo-600"
        />
        This is a series
      </label>
    </>
  );
}
