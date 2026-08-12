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

const MARGEM = 16;
const ALTURA_MINIMA_UTIL = 180;

export function Tour({ steps, aberto, onFechar }: { steps: TourStep[]; aberto: boolean; onFechar: () => void }) {
  const [passo, setPasso] = useState(0);
  const [posicao, setPosicao] = useState<(CSSProperties & { __rect?: DOMRect }) | null>(null);

  useEffect(() => {
    if (aberto) setPasso(0);
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [aberto, onFechar]);

  useEffect(() => {
    if (!aberto) return;
    const step = steps[passo];
    if (!step) return;
    const el = document.querySelector(`[data-tour="${step.targetId}"]`);
    if (!el) {
      setPosicao(centralizado());
      return;
    }
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    const id = setTimeout(() => {
      const rect = el.getBoundingClientRect();
      setPosicao(calcularPosicao(rect));
    }, 200);
    return () => clearTimeout(id);
  }, [aberto, passo, steps]);

  if (!aberto || steps.length === 0 || !posicao) return null;
  const step = steps[passo];
  const ultimo = passo === steps.length - 1;
  const { __rect: rectAlvo, ...cardStyle } = posicao;

  return (
    <div className="fixed inset-0 z-[60]" onClick={onFechar}>
      <div className="absolute inset-0 bg-primary/30" />
      {rectAlvo && (
        <div
          className="absolute rounded-lg ring-2 ring-secondary pointer-events-none transition-all"
          style={{
            top: rectAlvo.top - 6,
            left: rectAlvo.left - 6,
            width: rectAlvo.width + 12,
            height: rectAlvo.height + 12,
          }}
        />
      )}
      <div
        className="flex flex-col rounded-xl border border-border bg-card shadow-2xl"
        style={cardStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border p-4 pb-3 shrink-0">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Passo {passo + 1} de {steps.length}
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar tour"
            className="shrink-0 rounded-full w-6 h-6 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>
        <div className="p-4 pt-3 overflow-y-auto">
          <h3 className="font-serif text-lg text-foreground mb-2">{step.title}</h3>
          <p className="text-sm text-muted-foreground">{step.texto}</p>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border p-4 pt-3 shrink-0">
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

/** Estilo do card sem alvo definido (fallback): centralizado, sempre inteiro na tela. */
function centralizado(): CSSProperties & { __rect?: DOMRect } {
  return {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 340,
    maxWidth: `calc(100vw - ${MARGEM * 2}px)`,
    maxHeight: `calc(100vh - ${MARGEM * 2}px)`,
  };
}

/**
 * Posiciona o card perto do elemento alvo, abaixo por padrão. Se não houver espaço suficiente
 * embaixo, tenta acima; se nenhum dos dois tiver espaço útil, centraliza na tela. Em qualquer
 * caso, limita a altura ao espaço disponível e deixa o conteúdo rolar — nunca deixa o rodapé
 * (com os botões de fechar/avançar) cortado fora da tela.
 */
function calcularPosicao(rect: DOMRect): CSSProperties & { __rect?: DOMRect } {
  const largura = Math.min(360, window.innerWidth - MARGEM * 2);
  const left = Math.min(Math.max(rect.left, MARGEM), window.innerWidth - largura - MARGEM);

  const espacoAbaixo = window.innerHeight - rect.bottom - MARGEM * 2;
  const espacoAcima = rect.top - MARGEM * 2;

  if (espacoAbaixo >= ALTURA_MINIMA_UTIL) {
    return {
      position: "fixed",
      top: rect.bottom + MARGEM,
      left,
      width: largura,
      maxHeight: espacoAbaixo,
      __rect: rect,
    };
  }
  if (espacoAcima >= ALTURA_MINIMA_UTIL) {
    return {
      position: "fixed",
      bottom: window.innerHeight - rect.top + MARGEM,
      left,
      width: largura,
      maxHeight: espacoAcima,
      __rect: rect,
    };
  }
  return { ...centralizado(), __rect: rect };
}
