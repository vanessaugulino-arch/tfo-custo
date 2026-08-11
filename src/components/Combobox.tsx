import { useEffect, useRef, useState } from "react";

export interface ComboboxOption {
  id: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string | null;
  onChange: (id: string) => void;
  onCreate?: (nome: string) => Promise<string>; // retorna o id criado; omitido = seleção somente
  placeholder?: string;
  disabled?: boolean;
}

/** Combobox "criar ou selecionar": digita, filtra opções existentes, ou cria uma nova (se onCreate for passado). */
export function Combobox({ options, value, onChange, onCreate, placeholder, disabled }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.id === value);

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

  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()));
  const exactMatch = options.some((o) => o.label.toLowerCase() === query.trim().toLowerCase());

  async function handleCreate() {
    const nome = query.trim();
    if (!nome || creating || !onCreate) return;
    setCreating(true);
    try {
      const id = await onCreate(nome);
      onChange(id);
      setOpen(false);
      setQuery("");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-left text-sm disabled:opacity-50"
      >
        <span className={selected ? "" : "text-muted-foreground"}>
          {selected ? selected.label : placeholder ?? "Selecionar ou criar..."}
        </span>
        <span className="text-muted-foreground">▾</span>
      </button>

      {open && !disabled && (
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
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  onChange(o.id);
                  setOpen(false);
                  setQuery("");
                }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
              >
                {o.label}
              </button>
            ))}
            {query.trim() && !exactMatch && onCreate && (
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
