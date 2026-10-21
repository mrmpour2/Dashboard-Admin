import { useState } from "react";
import { useNavigate } from "react-router";
import { Search } from "lucide-react";
export default function SearchBox() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  return <form role="search" onSubmit={(event) => { event.preventDefault(); navigate("/products" + (search.trim() ? "?search=" + encodeURIComponent(search.trim()) : "")); }} className="hidden w-full max-w-sm items-center gap-2 rounded-lg border border-Border bg-Background px-3 lg:flex"><Search size={17} className="shrink-0 text-textSecondary" aria-hidden="true" /><input type="search" aria-label="جستجوی محصولات" placeholder="جستجوی محصولات…" value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none" /><button type="submit" className="rounded px-2 py-1 text-xs text-primary">جستجو</button></form>;
}
