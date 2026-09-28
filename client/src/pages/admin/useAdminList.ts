import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { Paginated } from "@shared/api";

/** Search + filter + pagination state for the admin tables, debounced to avoid a request per keystroke. */
export function useAdminList<T>(path: string, filterKey: string) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => {
    setPage(1);
  }, [debounced, filter]);

  const params = new URLSearchParams({ page: String(page), pageSize: "20" });
  if (debounced) params.set("search", debounced);
  if (filter !== "all") params.set(filterKey, filter);
  const key = `${path}?${params}`;
  const query = useQuery<Paginated<T>>({ queryKey: [key], placeholderData: keepPreviousData });

  return { query, key, search, setSearch, filter, setFilter, page, setPage, debounced };
}
