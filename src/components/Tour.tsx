import { useEffect, useState, type CSSProperties } from "react";

export interface TourStep {
  /** Deve casar com um elemento marcado `data-tour="<targetId>"` na tela. */
  targetId: string;
  title: string;
  texto: string;
}

/** Mostra o tour automaticamente na primeira visita a esta tela (por navegador), e permite reabrir a qualquer momento. */
export function useTourAutoShow(tourKey: string) {
  const storageKey = `tfo_tour_visto_${tourKey}`;
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(storageKey)) {
      setAberto(true);
    }
  }, [storageKey]);

  function fechar() {
    localStorage.setItem(storageKey, "1");
    setAberto(false);
  }

  return { aberto, abrir: () => setAberto(true), fechar };
}

export function Tour({ steps, aberto, onFechar }: { steps: TourStep[]; aberto: boolean; onFechar: () => void }) {
  const [passo, setPasso] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (aberto) setPasso(0);
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const step = steps[passo];
    if (!step) return;
    const el = document.querySelector(`[data-tour="${step.targetId}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    const id = setTimeout(() => setRect(el.getBoundingClientRect()), 200);
    return () => clearTimeout(id);
  }, [aberto, passo, steps]);

  if (!aberto || steps.length === 0) return null;
  const step = steps[passo];
  const ultimo = passo === steps.length - 1;

  const popoverStyle: CSSProperties = rect
    ? {
        position: "fixed",
        top: Math.min(rect.bottom + 12, window.innerHeight - 220),
        left: Math.min(Math.max(rect.left, 16), window.innerWidth - 336),
        width: 320,
      }
    : { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 320 };

  return (
    <div className="fixed inset-0 z-[60]" onClick={onFechar}>
      <div className="absolute inset-0 bg-primary/30" />
      {rect && (
        <div
          className="absolute rounded-lg ring-2 ring-secondary pointer-events-none transition-all"
          style={{ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 }}
        />
      )}
      <div className="rounded-xl border border-border bg-card shadow-2xl p-5" style={popoverStyle} onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Passo {passo + 1} de {steps.length}
        </div>
        <h3 className="font-serif text-lg text-foreground mb-2">{step.title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{step.texto}</p>
        <div className="flex items-center justify-between">
          <button type="button" className="text-xs text-muted-foreground underline" onClick={onFechar}>
            Pular tour
          </button>
          <div className="flex gap-2">
            {passo > 0 && (
              <button
                type="button"
                onClick={() => setPasso((p) => Math.max(0, p - 1))}
                className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
              >
                ← Anterior
              </button>
            )}
            <button
              type="button"
              onClick={() => (ultimo ? onFechar() : setPasso((p) => p + 1))}
              className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm hover:opacity-90"
            >
              {ultimo ? "Concluir" : "Próximo →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
