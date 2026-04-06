export default function ControlsBar({
  q,
  setQ,
  category,
  setCategory,
  autoRefresh,
  setAutoRefresh
}: {
  q: string;
  setQ: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  autoRefresh: boolean;
  setAutoRefresh: (v: boolean) => void;
}) {
  return (
    <div className="panel px-3 py-2 flex flex-col xl:flex-row gap-2 xl:items-center">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search events"
        className="w-full xl:w-72 bg-[#101a2f] border border-[#22324f] rounded px-2 py-1.5 text-[12px]"
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="bg-[#101a2f] border border-[#22324f] rounded px-2 py-1.5 text-[12px]"
      >
        <option value="">All categories</option>
        <option value="Politics">Politics</option>
        <option value="Sports">Sports</option>
        <option value="Crypto">Crypto</option>
      </select>
      <label className="text-[12px] flex items-center gap-2 xl:ml-auto muted">
        <input checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} type="checkbox" />
        Auto refresh (15s)
      </label>
    </div>
  );
}
