export default function WeatherLoading() {
  return (
    <main className="skyline-bg flex flex-1 flex-col gap-10 px-4 py-8 sm:px-8 sm:py-12">
      <div className="skyline-skeleton h-10 w-36 rounded-full" />
      <div className="flex max-w-3xl flex-col gap-4">
        <div className="skyline-skeleton h-6 w-28 rounded-full" />
        <div className="skyline-skeleton h-16 w-64 rounded-2xl" />
        <div className="skyline-skeleton h-5 w-full max-w-lg rounded-lg" />
      </div>
      <div className="grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="skyline-skeleton h-32 rounded-2xl" />
        ))}
      </div>
      <div className="grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skyline-skeleton h-48 rounded-2xl" />
        ))}
      </div>
    </main>
  );
}
