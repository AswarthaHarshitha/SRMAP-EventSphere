import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ListToolbar({
  search,
  onSearch,
  placeholder,
  filter,
  onFilter,
  options,
  filterLabel,
}: {
  search: string;
  onSearch: (v: string) => void;
  placeholder: string;
  filter: string;
  onFilter: (v: string) => void;
  options: { value: string; label: string }[];
  filterLabel: string;
}) {
  return (
    <div className="mt-6 flex flex-col gap-2 sm:flex-row">
      <div className="relative flex-1">
        <label htmlFor="admin-search" className="sr-only">Search</label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input id="admin-search" value={search} onChange={(e) => onSearch(e.target.value)} placeholder={placeholder} className="h-10 bg-card pl-9" />
      </div>
      <Select value={filter} onValueChange={onFilter}>
        <SelectTrigger className="h-10 bg-card sm:w-48" aria-label={filterLabel}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
