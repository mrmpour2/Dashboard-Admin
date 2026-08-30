import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "../../../components/ui";

function StatCard({ title, value, delta, isPositive, icon: Icon, index = 0 }) {
  return (
    <Card
      className="animate-fade-in-up p-5"
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="text-right">
          <p className="text-sm text-textSecondary">{title}</p>
          <p className="mt-2 font-Outfit text-2xl font-bold text-textPrimary">
            {value}
          </p>
        </div>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-Glow">
          <Icon size={20} />
        </span>
      </div>

      <div className="mt-4 flex items-center gap-1.5">
        <span
          className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
            isPositive
              ? "bg-profit/10 text-profit"
              : "bg-loos/10 text-loos"
          }`}
        >
          {isPositive ? (
            <ArrowUpRight size={13} />
          ) : (
            <ArrowDownRight size={13} />
          )}
          {delta}
        </span>
        <span className="text-xs text-textMuted">نسبت به ماه قبل</span>
      </div>
    </Card>
  );
}

export default StatCard;
