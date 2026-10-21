function TableFilter({ value = "", onChange, placeholder = "فیلتر..." }) {
  return (
    <label className="block w-full max-w-sm">
      <span className="sr-only">فیلتر جدول</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        aria-label="فیلتر جدول"
        className="w-full rounded-xl border border-Border bg-Surface px-3 py-2 text-sm text-textPrimary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

export default TableFilter;
