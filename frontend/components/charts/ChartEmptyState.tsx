"use client";

interface ChartEmptyStateProps {
  height?: number;
  message?: string;
}

export default function ChartEmptyState({
  height = 220,
  message = "No data available for selected window",
}: ChartEmptyStateProps) {
  return (
    <div
      className="flex items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/20 text-sm text-muted-foreground"
      style={{ height }}
    >
      {message}
    </div>
  );
}
