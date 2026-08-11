import { useEffect, useRef, useState } from "react";
import type { ComboboxOption } from "./Combobox";

interface ComboboxMultiProps {
  options: ComboboxOption[];
  values: string[];
  onChange: (ids: string[]) => void;
  onCreate: (nome: string) => Promise<string>;
  placeholder?: string;
}

/** Combobox multi-seleção "criar ou selecionar" — mesmo conceito do Combobox, mas mantém o dropdown aberto para escolher vários. */
export function ComboboxMulti({ options, values, onChange, onCreate, placeholder }: ComboboxMultiProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selected = options.filter((o) => values.includes(o.id));
  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()));
  const exactMatch = options.some((o) => o.label.toLowerCase() === query.trim().toLowerCase());

  function toggle(id: string) {
    onChange(values.includes(id) ? values.filter((v) => v !== id) : [...values, id]);
  }

  async function handleCreate() {
    const nome = query.trim();
    if (!nome || creating) return;
    setCreating(true);
    try {
      const id = await onCreate(nome);
      onChange([...values, id]);
      setQuery("");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-left text-sm min-h-[38px]"
      >
        {selected.length === 0 && <span className="text-muted-foreground">{placeholder ?? "Selecionar ou criar..."}</span>}
        {selected.map((o) => (
          <span key={o.id} className="inline-flex items-center gap-1 rounded-full bg-accent text-accent-foreground px-2 py-0.5 text-xs font-medium">
            {o.label}
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                toggle(o.id);
              }}
              className="cursor-pointer opacity-70 hover:opacity-100"
            >
              ×
            </span>
          </span>
        ))}
        <span className="ml-auto text-muted-foreground">▾</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-card shadow-lg">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite para buscar ou criar..."
            className="w-full border-b border-border px-3 py-2 text-sm outline-none bg-transparent"
          />
          <div className="max-h-48 overflow-auto py-1">
            {filtered.map((o) => (
              <label key={o.id} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted cursor-pointer">
                <input type="checkbox" checked={values.includes(o.id)} onChange={() => toggle(o.id)} />
                {o.label}
              </label>
            ))}
            {query.trim() && !exactMatch && (
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="block w-full px-3 py-2 text-left text-sm text-accent-foreground hover:bg-muted disabled:opacity-50"
              >
                {creating ? "Criando..." : `+ Criar "${query.trim()}"`}
              </button>
            )}
            {filtered.length === 0 && !query.trim() && (
              <div className="px-3 py-2 text-sm text-muted-foreground">Nenhuma opção ainda.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
