export function formatPrice(value, locale = "fa-IR", options = {}) {
  if (value === null || value === undefined || value === "") return "—";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  const { currency = true, ...numberOptions } = options;
  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
    ...numberOptions,
  }).format(amount);
  if (!currency) return formatted;
  return locale.startsWith("fa") ? `${formatted} تومان` : `${formatted} Toman`;
}
