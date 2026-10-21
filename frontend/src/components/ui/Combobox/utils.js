// Small, dependency-free helpers shared across the Combobox components.

export function normalizeForSearch(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

/**
 * Case-insensitive substring match used to decide whether an item
 * should be visible for the current search query. An empty query
 * matches everything.
 */
export function matchesSearchValue(label, searchValue) {
  const query = normalizeForSearch(searchValue);
  if (!query) return true;
  return normalizeForSearch(label).includes(query);
}

/**
 * Combine multiple refs (object refs and/or callback refs) into one
 * callback ref, so a component can use a ref internally (e.g. for
 * scrollIntoView) while still forwarding a consumer's ref to the
 * same DOM node.
 */
export function mergeRefs(...refs) {
  return (node) => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === "function") {
        ref(node);
      } else {
        ref.current = node;
      }
    });
  };
}
