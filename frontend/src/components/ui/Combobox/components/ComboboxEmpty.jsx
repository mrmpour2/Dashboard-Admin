import useCombobox from "../context/useCombobox";

function ComboboxEmpty({ children = "موردی پیدا نشد." }) {
  const { visibleItemsCount } = useCombobox();

  // Only render once every item has been filtered out by the
  // current search query.
  if (visibleItemsCount > 0) return null;

  return (
    <div className="px-3 py-4 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export default ComboboxEmpty;
