// ComboboxVariants.js
//
// Consumed by ComboboxTrigger (type + size) and ComboboxItem
// (status). Previously defined but never imported anywhere — now
// wired in so styling stays in one place instead of being
// hardcoded per component.

export const type = {
  default:
    "border border-input bg-background text-foreground hover:border-ring/50 focus:border-ring focus:ring-2 focus:ring-ring/20",
  outline:
    "border-2 border-border bg-transparent text-foreground hover:border-ring/50 focus:border-ring focus:ring-2 focus:ring-ring/20",
  filled:
    "border border-transparent bg-muted text-foreground hover:bg-muted/80 focus:bg-background focus:border-ring focus:ring-2 focus:ring-ring/20",
  ghost:
    "border border-transparent bg-transparent text-foreground hover:bg-muted focus:bg-background focus:border-ring focus:ring-2 focus:ring-ring/20",
};

export const size = {
  sm: "h-8 px-2.5 text-xs rounded-md gap-1.5",
  md: "h-10 px-3 text-sm rounded-md gap-2",
  lg: "h-12 px-4 text-base rounded-lg gap-2.5",
};

export const content = {
  default: "border border-border bg-popover shadow-md",
  elevated: "border border-border bg-popover shadow-lg backdrop-blur-sm",
};

export const status = {
  active: "text-foreground",
  disabled: "cursor-not-allowed opacity-50 pointer-events-none",
  selected: "bg-primary/10 text-primary font-medium",
};
