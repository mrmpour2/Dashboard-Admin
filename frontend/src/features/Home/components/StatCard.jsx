export default function StatCard({ title, value, suffix, icon: Icon }) {
  return <div className="flex items-start gap-3 p-5 text-start sm:border-e sm:border-Border last:border-e-0"><span aria-hidden="true" className="mt-1 rounded-lg bg-SurfaceMuted p-2 text-textSecondary"><Icon size={19} /></span><div className="min-w-0"><p className="text-xs text-textSecondary">{title}</p><p className="mt-2 break-words text-xl font-bold tabular-nums text-textPrimary">{value}</p><p className="mt-1 text-xs text-textSecondary">{suffix}</p></div></div>;
}
