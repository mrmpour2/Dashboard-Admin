const cellVariants = {
  default: "px-4 py-3 text-sm text-textSecondary",
  numeric: "px-4 py-3 text-sm text-textPrimary tabular-nums",
  code: "px-4 py-3 text-xs font-mono text-textMuted",
  actions: "px-4 py-3",
  primary: "px-4 py-3 text-sm font-medium text-textPrimary",
};

function TableCell({
  children,
  variant = "default",
  className = "",
  ...props
}) {
  return (
    <td className={`${cellVariants[variant]} ${className}`} {...props}>
      {children}
    </td>
  );
}

export default TableCell;
