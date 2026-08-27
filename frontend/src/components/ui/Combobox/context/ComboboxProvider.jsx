import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import ComboboxContext from "./ComboboxContext";
import { matchesSearchValue } from "../utils";

function ComboboxProvider({
  children,
  value: controlledValue,
  defaultValue = null,
  onValueChange,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
}) {
  const isControlledValue = controlledValue !== undefined;
  const isControlledOpen = controlledOpen !== undefined;

  const [internalValue, setInternalValue] = useState(defaultValue);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [searchValue, setSearchValue] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // itemsRef mutations aren't reactive on their own (it's a plain
  // Map), so this counter is bumped on every register/unregister to
  // force the memoized item lists below to recompute.
  const [itemsVersion, setItemsVersion] = useState(0);

  const itemsRef = useRef(new Map());
  const listboxId = useId();

  const comboboxValue = isControlledValue ? controlledValue : internalValue;
  const open = isControlledOpen ? controlledOpen : internalOpen;

  const bumpItemsVersion = useCallback(() => {
    setItemsVersion((v) => v + 1);
  }, []);

  const setValue = useCallback(
    (nextValue) => {
      if (!isControlledValue) {
        setInternalValue(nextValue);
      }
      onValueChange?.(nextValue);
    },
    [isControlledValue, onValueChange],
  );

  const setOpen = useCallback(
    (nextOpen) => {
      if (!isControlledOpen) {
        setInternalOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isControlledOpen, onOpenChange],
  );

  const toggle = useCallback(() => {
    setOpen(!open);
  }, [open, setOpen]);

   const registerItem = useCallback(
    (item) => {
      itemsRef.current.set(item.value, item);
      bumpItemsVersion();
    },
    [bumpItemsVersion],
  );

  const unregisterItem = useCallback(
    (value) => {
      itemsRef.current.delete(value);
      bumpItemsVersion();
    },
    [bumpItemsVersion],
  );

  const getItems = useCallback(() => Array.from(itemsRef.current.values()), []);

  const visibleItems = useMemo(
    () => getItems().filter((item) => matchesSearchValue(item.label, searchValue)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getItems, searchValue, itemsVersion],
  );

  const enabledVisibleItems = useMemo(
    () => visibleItems.filter((item) => !item.disabled),
    [visibleItems],
  );

  // A stale highlight from a previous search or session should
  // never persist: reset it whenever the query changes or the list
  // closes.
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchValue, open]);

  const moveHighlight = useCallback(
    (direction) => {
      const items = enabledVisibleItems;
      if (!items.length) return;

      setHighlightedIndex((currentIndex) => {
        let nextIndex;

        if (direction === "first") {
          nextIndex = 0;
        } else if (direction === "last") {
          nextIndex = items.length - 1;
        } else if (direction === "next") {
          nextIndex = currentIndex + 1 >= items.length ? 0 : currentIndex + 1;
        } else {
          nextIndex =
            currentIndex - 1 < 0 ? items.length - 1 : currentIndex - 1;
        }

        items[nextIndex]?.ref?.current?.scrollIntoView({ block: "nearest" });

        return nextIndex;
      });
    },
    [enabledVisibleItems],
  );

  const selectHighlightedItem = useCallback(() => {
    const item = enabledVisibleItems[highlightedIndex];
    if (!item || item.disabled) return;

    setValue({ value: item.value, label: item.label });
    setSearchValue(item.label);
    setOpen(false);
  }, [enabledVisibleItems, highlightedIndex, setValue, setOpen]);

  const highlightedItem = enabledVisibleItems[highlightedIndex] ?? null;

  const contextValue = useMemo(
    () => ({
      open,
      setOpen,
      toggle,

      comboboxValue,
      setValue,

      searchValue,
      setSearchValue,

      highlightedIndex,
      highlightedValue: highlightedItem?.value,

      listboxId,
      activeDescendantId: highlightedItem?.id,

      registerItem,
      unregisterItem,
      getItems,
      getVisibleItems: () => visibleItems,
      getEnabledItems: () => enabledVisibleItems,
      visibleItemsCount: visibleItems.length,

      moveHighlight,
      selectHighlightedItem,
    }),
    [
      open,
      setOpen,
      toggle,
      comboboxValue,
      setValue,
      searchValue,
      highlightedIndex,
      highlightedItem,
      listboxId,
      registerItem,
      unregisterItem,
      getItems,
      visibleItems,
      enabledVisibleItems,
      moveHighlight,
      selectHighlightedItem,
    ],
  );

  return (
    <ComboboxContext.Provider value={contextValue}>
      {children}
    </ComboboxContext.Provider>
  );
}

export default ComboboxProvider;
