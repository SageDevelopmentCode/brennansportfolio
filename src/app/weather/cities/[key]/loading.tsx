export default function CityDetailLoading() {
  return (
    <main className="skyline-bg flex flex-1 flex-col gap-10 px-4 py-8 sm:px-8 sm:py-12">
      <div className="skyline-skeleton h-10 w-40 rounded-full" />
      <div className="skyline-skeleton h-72 max-w-4xl rounded-3xl" />
      <div className="grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="skyline-skeleton h-28 rounded-2xl" />
        ))}
      </div>
    </main>
  );
}
