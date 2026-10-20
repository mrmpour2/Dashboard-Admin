export function readTableState(params, defaults) {
  const result = { ...defaults };
  for (const [key, fallback] of Object.entries(defaults)) {
    const value = params.get(key);
    if (value === null) continue;
    if (typeof fallback === "number") {
      const number = Number(value);
      result[key] = Number.isSafeInteger(number) && number > 0 ? number : fallback;
    } else result[key] = value;
  }
  return result;
}
