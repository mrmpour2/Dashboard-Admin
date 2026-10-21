import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-SurfaceMuted", className)}
      {...props}
    />
  );
}

export { Skeleton };
