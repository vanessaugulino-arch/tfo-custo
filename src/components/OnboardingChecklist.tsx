import { useState } from "react";
import { Link } from "react-router-dom";
import { useComprasInsumo, useProdutos, useServicosFornecedor } from "@/hooks/useData";

const DISMISS_KEY = "fashionpack_onboarding_dismissed";

export function OnboardingChecklist() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === "1");
  const { data: compras = [] } = useComprasInsumo();
  const { data: servicos = [] } = useServicosFornecedor();
  const { data: produtos = [] } = useProdutos();

  const passos = [
    { label: "Cadastre um insumo (fornecedor, material e preço)", done: compras.length > 0, to: "/insumos" },
    { label: "Cadastre um serviço (modelagem, corte, costura...)", done: servicos.length > 0, to: "/servicos" },
    { label: "Monte o custo do seu primeiro produto", done: produtos.length > 0, to: "/produtos/novo" },
    { label: "Aprove um produto para descontar o estoque", done: produtos.some((p) => p.status === "aprovado"), to: "/colecoes" },
  ];

  const concluidos = passos.filter((p) => p.done).length;

  if (dismissed || concluidos === passos.length) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <div className="mb-6 rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="font-serif text-lg text-foreground">Bem-vinda ao Fashion Skills</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {concluidos} de {passos.length} passos concluídos — siga a ordem para chegar ao custo do primeiro produto.
          </p>
        </div>
        <button onClick={dismiss} className="text-muted-foreground hover:text-foreground text-sm" aria-label="Dispensar">
          ✕
        </button>
      </div>
      <ol className="flex flex-col gap-2">
        {passos.map((p, i) => (
          <li key={p.to}>
            <Link
              to={p.to}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                p.done ? "text-muted-foreground" : "hover:bg-muted text-foreground"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                  p.done ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {p.done ? "✓" : i + 1}
              </span>
              <span className={p.done ? "line-through" : ""}>{p.label}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
