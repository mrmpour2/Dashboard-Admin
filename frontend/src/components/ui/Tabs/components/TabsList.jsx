function TabsList({ children }) {
  return (
    <div
      role="tablist"
      className="inline-flex h-10 items-center justify-center gap-1 rounded-lg bg-muted p-2 bg-primary/10"
    >
      {children}
    </div>
  );
}

export default TabsList;
