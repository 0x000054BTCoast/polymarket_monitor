interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  autoRefresh: boolean;
  onAutoRefreshChange: (value: boolean) => void;
}

export default function FilterBar({
  searchQuery,
  onSearchChange,
  category,
  onCategoryChange,
  autoRefresh,
  onAutoRefreshChange,
}: FilterBarProps) {
  return (
    <div className="card p-4">
      <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
        <div className="flex-1">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search events by title..."
              className="input pl-10 w-full lg:max-w-md"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="select"
          >
            <option value="">All Categories</option>
            <option value="Politics">Politics</option>
            <option value="Sports">Sports</option>
            <option value="Crypto">Crypto</option>
            <option value="Entertainment">Entertainment</option>
            <option value="Science">Science</option>
          </select>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div className="relative">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => onAutoRefreshChange(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:bg-primary transition-colors" />
              <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-foreground rounded-full transition-transform peer-checked:translate-x-4" />
            </div>
            <span className="text-sm text-muted-foreground">Auto-refresh</span>
          </label>
        </div>
      </div>
    </div>
  );
}
