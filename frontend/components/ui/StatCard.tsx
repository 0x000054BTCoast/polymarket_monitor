interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
}

export default function StatCard({ label, value, subValue, trend, icon }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-semibold tracking-tight">{value}</p>
            {trend && trend !== "neutral" && (
              <span
                className={`text-xs font-medium ${
                  trend === "up" ? "text-success" : "text-destructive"
                }`}
              >
                {trend === "up" ? "+" : "-"}
              </span>
            )}
          </div>
          {subValue && (
            <p className="text-xs text-muted-foreground">{subValue}</p>
          )}
        </div>
        {icon && (
          <div className="p-2 rounded-lg bg-muted/50 text-muted-foreground">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
