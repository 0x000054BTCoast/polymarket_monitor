"use client";

import { RankRow } from "@/types";
import Badge from "./ui/Badge";
import DataTable, { Column } from "./ui/DataTable";

type HotMode = "derived" | "official";

interface HotEventsTableProps {
  derivedRows: RankRow[];
  officialRows: RankRow[];
  mode: HotMode;
  onModeChange: (mode: HotMode) => void;
  onRowClick?: (row: RankRow) => void;
}

export default function HotEventsTable({
  derivedRows,
  officialRows,
  mode,
  onModeChange,
  onRowClick,
}: HotEventsTableProps) {
  const rows = mode === "official" ? officialRows : derivedRows;

  const formatScore = (score: unknown) => {
    const num = Number(score);
    if (isNaN(num)) return "-";
    return num.toFixed(2);
  };

  const getHotLevel = (score: number): "destructive" | "warning" | "info" | "muted" => {
    if (score >= 0.9) return "destructive";
    if (score >= 0.7) return "warning";
    if (score >= 0.5) return "info";
    return "muted";
  };

  const columns: Column<RankRow>[] = [
    {
      key: "title",
      header: "Event",
      render: (_, row) => {
        const title = String(row.title || row.event_id || "-");
        const category = String(row.category || "");
        return (
          <div className="max-w-[300px]">
            <p className="font-medium text-foreground truncate">{title}</p>
            {category && <p className="text-xs text-muted-foreground mt-0.5">{category}</p>}
          </div>
        );
      },
    },
    {
      key: "score",
      header: mode === "official" ? "Official Score" : "Hot Score",
      width: "140px",
      align: "right",
      render: (_, row) => {
        const value = mode === "official" ? row.official_score : row.hot_score;
        const score = Number(value || 0);
        return (
          <div className="flex items-center justify-end gap-2">
            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.min(score * 100, 100)}%` }}
              />
            </div>
            <span className="font-mono text-sm">{formatScore(value)}</span>
          </div>
        );
      },
    },
    {
      key: "level",
      header: mode === "official" ? "Rank" : "Level",
      width: "90px",
      align: "center",
      render: (_, row) => {
        if (mode === "official") {
          return <Badge variant="info">#{Number(row.official_rank || 0) || "-"}</Badge>;
        }
        const score = Number(row.hot_score || 0);
        const level = getHotLevel(score);
        const labels = {
          destructive: "Hot",
          warning: "Warm",
          info: "Active",
          muted: "Low",
        };
        return <Badge variant={level}>{labels[level]}</Badge>;
      },
    },
    {
      key: "source",
      header: "Source",
      width: "90px",
      align: "center",
      render: () => (
        <Badge variant="muted" size="sm">
          {mode === "official" ? "Official" : "Derived"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="card">
      <div className="p-4 border-b border-border flex items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">Hot Events</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            口径来源：{mode === "official" ? "Official Trending" : "Derived Hot Formula"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-border overflow-hidden">
            <button
              className={`px-3 py-1 text-xs ${mode === "derived" ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground"}`}
              onClick={() => onModeChange("derived")}
            >
              Derived
            </button>
            <button
              className={`px-3 py-1 text-xs ${mode === "official" ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground"}`}
              onClick={() => onModeChange("official")}
            >
              Official
            </button>
          </div>
          <Badge variant="muted">{rows.length} events</Badge>
        </div>
      </div>
      <DataTable
        columns={columns}
        data={rows}
        onRowClick={onRowClick}
        showIndex
        maxHeight="360px"
        emptyMessage="No hot events at the moment"
      />
    </div>
  );
}
