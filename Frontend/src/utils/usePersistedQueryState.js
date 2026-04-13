import { useEffect, useState } from "react";

const defaultParse = (rawValue, defaultValue) => {
  if (rawValue === null || rawValue === undefined) return defaultValue;
  return rawValue;
};

const defaultSerialize = (value) => String(value ?? "");

export const applyQueryParam = (params, key, value, shouldSkip = (val) => val === null || val === undefined || val === "") => {
  if (shouldSkip(value)) {
    params.delete(key);
    return;
  }

  params.set(key, String(value));
};

export const usePersistedQueryState = ({
  searchParams,
  queryKey,
  storageKey,
  defaultValue,
  parse = defaultParse,
  serialize = defaultSerialize,
}) => {
  const [value, setValue] = useState(() => {
    const fromQuery = searchParams?.get?.(queryKey);

    if (fromQuery !== null && fromQuery !== undefined) {
      try {
        return parse(fromQuery, defaultValue, "query");
      } catch {
        return defaultValue;
      }
    }

    try {
      const fromStorage = localStorage.getItem(storageKey);
      if (fromStorage !== null && fromStorage !== undefined) {
        return parse(fromStorage, defaultValue, "storage");
      }
    } catch (error) {
      console.error(`Failed to read persisted state for ${storageKey}`, error);
    }

    return defaultValue;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, serialize(value));
    } catch (error) {
      console.error(`Failed to persist state for ${storageKey}`, error);
    }
  }, [storageKey, value, serialize]);

  return [value, setValue];
};
