import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePerfilNegocio, useSalvarPerfilNegocio, type PerfilNegocio } from "@/hooks/useData";
import { REGIME_LABELS } from "@/lib/format";

const SEGMENTOS: { grupo: string; itens: string[] }[] = [
  { grupo: "Acessórios e bolsas", itens: ["Acessórios e Bolsas Feminino", "Acessórios e Bolsas Masculino", "Acessórios Infantil"] },
  { grupo: "Calçados", itens: ["Calçados Femininos", "Calçados Infantis", "Calçados Masculinos"] },
  { grupo: "Fitness", itens: ["Fitness Feminino", "Fitness Infantil", "Fitness Masculino"] },
  { grupo: "Jóias, semijóias, bijuterias e óculos", itens: ["Jóias, Semijóias, Bijuterias e óculos"] },
  { grupo: "Moda praia", itens: ["Moda Praia Feminino", "Moda Praia Infantil", "Moda Praia Masculino"] },
  { grupo: "Underwear", itens: ["Underwear Feminino", "Underwear Infantil", "Underwear Masculino"] },
  { grupo: "Vestuário", itens: ["Vestuário Feminino", "Vestuário Infantil", "Vestuário Masculino"] },
];

const FATURAMENTOS = ["Até R$ 20 mil/mês", "R$ 20 mil – R$ 100 mil/mês", "R$ 100 mil – R$ 500 mil/mês", "Acima de R$ 500 mil/mês"];
const ESTAGIOS = ["Validando a primeira coleção", "Vendendo com recorrência", "Escalando a produção", "Operação madura"];

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// Layout compartilhado
// ---------------------------------------------------------------------------

interface OnboardingLayoutProps {
  etapaAtual: number;
  totalEtapas: number;
  tituloDestaque: string;
  descricaoDireita?: string;
  children: ReactNode;
  painelLateral?: ReactNode;
  painelTitulo?: string;
  podeContinuar: boolean;
  aoContinuar: () => void;
  aoVoltar?: () => void;
  proximoTexto?: string;
  carregando?: boolean;
  textoBotao?: string;
  modo?: "onboarding" | "configuracoes";
}

function OnboardingLayout({
  etapaAtual,
  totalEtapas,
  tituloDestaque,
  descricaoDireita,
  children,
  painelLateral,
  painelTitulo,
  podeContinuar,
  aoContinuar,
  aoVoltar,
  proximoTexto,
  carregando,
  textoBotao,
  modo,
}: OnboardingLayoutProps) {
  const { user } = useAuth();
  const primeiroNome = user?.email ? capitalize(user.email.split("@")[0].split(/[.\-_0-9]/)[0]) : "";

  return (
    <div className="min-h-screen bg-background px-6 py-10 md:px-16">
      <div className="max-w-6xl mx-auto">
        {modo === "configuracoes" && (
          <Link to="/inicio" className="mb-4 inline-block text-sm text-muted-foreground underline">
            ← Voltar para o app sem salvar
          </Link>
        )}
        <div className="flex flex-col md:flex-row justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-serif text-foreground">Olá{primeiroNome ? `, ${primeiroNome}` : ""}.</h1>
            <h2 className="text-3xl md:text-4xl font-serif italic text-secondary">{tituloDestaque}</h2>
          </div>
          {descricaoDireita && <p className="max-w-sm text-sm text-muted-foreground md:text-right">{descricaoDireita}</p>}
        </div>

        <div className="mb-10">
          <div className="flex items-center justify-between text-xs font-semibold tracking-wide text-muted-foreground uppercase mb-2">
            <span>Cadastro inicial</span>
            <span>
              {String(etapaAtual).padStart(2, "0")} de {String(totalEtapas).padStart(2, "0")}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${(etapaAtual / totalEtapas) * 100}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-10 items-start">
          <div className="flex flex-col gap-10 pb-16">{children}</div>

          <div className="md:sticky md:top-10 rounded-xl border border-border bg-card p-6 flex flex-col gap-4">
            {painelTitulo && <h3 className="font-serif text-lg text-foreground">{painelTitulo}</h3>}
            {painelLateral}
            <button
              type="button"
              onClick={aoContinuar}
              disabled={!podeContinuar || carregando}
              className="w-full rounded-md px-4 py-2.5 text-sm font-medium bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              {carregando ? "Salvando..." : (textoBotao ?? "Continuar →")}
            </button>
            {aoVoltar && (
              <button
                type="button"
                onClick={aoVoltar}
                disabled={carregando}
                className="w-full rounded-md px-4 py-2.5 text-sm font-medium border border-border hover:bg-muted disabled:opacity-40 transition-colors"
              >
                ← Voltar
              </button>
            )}
            {proximoTexto && <p className="text-xs text-muted-foreground text-center">{proximoTexto}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h3 className="text-xl font-serif text-foreground mb-1">{title}</h3>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function PillGroup({ options, value, onChange }: { options: string[]; value: string | null; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((op) => (
        <button
          key={op}
          type="button"
          onClick={() => onChange(op)}
          className={`rounded-lg px-4 py-3 text-sm text-left border transition-colors ${
            value === op ? "bg-accent border-accent text-accent-foreground font-medium" : "bg-card border-border hover:border-secondary"
          }`}
        >
          {op}
        </button>
      ))}
    </div>
  );
}

function PillGroupMulti({ options, values, onToggle }: { options: string[]; values: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((op) => {
        const selecionado = values.includes(op);
        return (
          <button
            key={op}
            type="button"
            onClick={() => onToggle(op)}
            className={`rounded-lg px-4 py-3 text-sm text-left border transition-colors ${
              selecionado ? "bg-accent border-accent text-accent-foreground font-medium" : "bg-card border-border hover:border-secondary"
            }`}
          >
            {op}
          </button>
        );
      })}
    </div>
  );
}

function toggleEmArray(lista: string[] | undefined, valor: string): string[] {
  const atual = lista ?? [];
  return atual.includes(valor) ? atual.filter((v) => v !== valor) : [...atual, valor];
}

function RadioCard({
  title,
  description,
  selected,
  onSelect,
}: {
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-lg border p-4 transition-colors ${
        selected ? "bg-accent border-accent" : "bg-card border-border hover:border-secondary"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-sm text-foreground">{title}</span>
        <span
          className={`h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center ${selected ? "border-primary" : "border-muted-foreground"}`}
        >
          {selected && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Wizard
// ---------------------------------------------------------------------------

type Rascunho = Partial<PerfilNegocio>;

type EtapaKey = "marca" | "negocio" | "como_funciona" | "producao_interna" | "regime" | "final";

interface OnboardingWizardProps {
  /** "onboarding" (padrão) trava o app até concluir; "configuracoes" é uma edição normal, acessível a qualquer momento. */
  modo?: "onboarding" | "configuracoes";
}

export function OnboardingWizard({ modo = "onboarding" }: OnboardingWizardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: perfilExistente } = usePerfilNegocio(user?.id);
  const salvar = useSalvarPerfilNegocio();

  const [etapa, setEtapa] = useState<EtapaKey>("marca");
  const [rascunho, setRascunho] = useState<Rascunho>(() => perfilExistente ?? {});

  const mostrarProducaoInterna = rascunho.modelo_producao === "propria" || rascunho.modelo_producao === "misto";
  const ordemEtapas: EtapaKey[] = [
    "marca",
    "negocio",
    "como_funciona",
    ...(mostrarProducaoInterna ? (["producao_interna"] as const) : []),
    "regime",
    "final",
  ];
  const etapaAtual = ordemEtapas.indexOf(etapa) + 1;
  const totalEtapas = ordemEtapas.length;
  const indiceAtual = ordemEtapas.indexOf(etapa);
  const aoVoltar = indiceAtual > 0 ? () => setEtapa(ordemEtapas[indiceAtual - 1]) : undefined;

  function atualizar<K extends keyof Rascunho>(campo: K, valor: Rascunho[K]) {
    setRascunho((prev) => ({ ...prev, [campo]: valor }));
  }

  async function salvarEAvancar(campos: Rascunho, proximaEtapa: EtapaKey | null) {
    if (!user) return;
    await salvar.mutateAsync({ userId: user.id, ...campos });
    if (proximaEtapa) setEtapa(proximaEtapa);
    else navigate("/");
  }

  if (etapa === "marca") {
    return (
      <OnboardingLayout
        etapaAtual={etapaAtual}
        totalEtapas={totalEtapas}
        modo={modo}
        tituloDestaque="Conta da sua marca."
        descricaoDireita="Esses dados orientam todas as leituras da plataforma: benchmark de segmento, faixa esperada de margem e mix de coleção."
        painelTitulo="Canal principal"
        painelLateral={
          <div className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground -mt-2">Pode marcar mais de um.</p>
            <RadioCard
              title="Varejo / D2C"
              description="Venda direta ao consumidor final."
              selected={(rascunho.canal_principal ?? []).includes("varejo_d2c")}
              onSelect={() => atualizar("canal_principal", toggleEmArray(rascunho.canal_principal, "varejo_d2c"))}
            />
            <RadioCard
              title="Atacado / B2B"
              description="Multimarcas, revenda, grandes pedidos."
              selected={(rascunho.canal_principal ?? []).includes("atacado_b2b")}
              onSelect={() => atualizar("canal_principal", toggleEmArray(rascunho.canal_principal, "atacado_b2b"))}
            />
          </div>
        }
        podeContinuar={!!rascunho.nome_marca?.trim() && (rascunho.segmento?.length ?? 0) > 0 && (rascunho.canal_principal?.length ?? 0) > 0}
        aoVoltar={aoVoltar}
        aoContinuar={() => salvarEAvancar(rascunho, "negocio")}
        proximoTexto="Próximo: faturamento, estágio e modelo"
        carregando={salvar.isPending}
      >
        <div>
          <SectionTitle title="Como sua marca se chama?" subtitle="Esse nome aparece no topo do painel e nos relatórios." />
          <input
            value={rascunho.nome_marca ?? ""}
            onChange={(e) => atualizar("nome_marca", e.target.value)}
            placeholder="Ex: Atelier Carmen, Studio 14, Veridiana"
            className="mt-4 w-full rounded-md border border-border bg-card px-4 py-3 text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
          />
        </div>

        <div>
          <SectionTitle title="Qual é o segmento principal?" subtitle="Pode selecionar mais de um — ex: Vestuário Feminino e Calçados Femininos." />
          <div className="mt-4 flex flex-col gap-5">
            {SEGMENTOS.map((s) => (
              <div key={s.grupo}>
                <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase mb-2 pb-1 border-b border-border">
                  {s.grupo}
                </div>
                <PillGroupMulti
                  options={s.itens}
                  values={rascunho.segmento ?? []}
                  onToggle={(v) => atualizar("segmento", toggleEmArray(rascunho.segmento, v))}
                />
              </div>
            ))}
          </div>
        </div>
      </OnboardingLayout>
    );
  }

  if (etapa === "negocio") {
    return (
      <OnboardingLayout
        etapaAtual={etapaAtual}
        totalEtapas={totalEtapas}
        modo={modo}
        tituloDestaque="Sobre o seu negócio."
        descricaoDireita="Ajuda a calibrar comparações e alertas ao longo da ferramenta."
        painelTitulo="Modelo de produção"
        painelLateral={
          <div className="flex flex-col gap-3">
            <RadioCard
              title="Produção própria"
              description="Fábrica ou ateliê interno."
              selected={rascunho.modelo_producao === "propria"}
              onSelect={() => atualizar("modelo_producao", "propria")}
            />
            <RadioCard
              title="Terceirizo a produção"
              description="Fornecedores fazem corte, costura e acabamento."
              selected={rascunho.modelo_producao === "terceirizada"}
              onSelect={() => atualizar("modelo_producao", "terceirizada")}
            />
            <RadioCard
              title="Misto"
              description="Parte própria, parte terceirizada."
              selected={rascunho.modelo_producao === "misto"}
              onSelect={() => atualizar("modelo_producao", "misto")}
            />
          </div>
        }
        podeContinuar={!!rascunho.faturamento_faixa && !!rascunho.estagio && !!rascunho.modelo_producao}
        aoVoltar={aoVoltar}
        aoContinuar={() => salvarEAvancar(rascunho, "como_funciona")}
        proximoTexto="Próximo: como o Fashion Skills funciona"
        carregando={salvar.isPending}
      >
        <div>
          <SectionTitle title="Qual a faixa de faturamento mensal?" />
          <div className="mt-4">
            <PillGroup options={FATURAMENTOS} value={rascunho.faturamento_faixa ?? null} onChange={(v) => atualizar("faturamento_faixa", v)} />
          </div>
        </div>
        <div>
          <SectionTitle title="Em que estágio a marca está?" />
          <div className="mt-4">
            <PillGroup options={ESTAGIOS} value={rascunho.estagio ?? null} onChange={(v) => atualizar("estagio", v)} />
          </div>
        </div>
      </OnboardingLayout>
    );
  }

  if (etapa === "como_funciona") {
    const passos = [
      { n: 1, titulo: "Insumos", texto: "Cadastre fornecedores e materiais — cada compra vira um preço por metro linear, já líquido de imposto." },
      { n: 2, titulo: "Serviços", texto: "Modelagem, corte, costura... cada fornecedor com seu modelo de cobrança (peça, tempo ou produto)." },
      { n: 3, titulo: "Produto", texto: "Junte insumos e serviços — o sistema soma tudo e congela o custo unitário no momento em que você salva." },
      { n: 4, titulo: "Coleções", texto: "Aprove os produtos que vão para produção — isso desconta o estoque previsto automaticamente." },
    ];
    return (
      <OnboardingLayout
        etapaAtual={etapaAtual}
        totalEtapas={totalEtapas}
        modo={modo}
        tituloDestaque="Como o Fashion Skills funciona."
        descricaoDireita="Quatro passos entre o insumo comprado e o custo final da peça."
        podeContinuar
        aoVoltar={aoVoltar}
        aoContinuar={() => salvarEAvancar({}, mostrarProducaoInterna ? "producao_interna" : "regime")}
        proximoTexto={mostrarProducaoInterna ? "Próximo: produção interna" : "Próximo: regime tributário padrão"}
        carregando={salvar.isPending}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {passos.map((p) => (
            <div key={p.n} className="rounded-lg border border-border bg-card p-5">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold mb-3">
                {p.n}
              </span>
              <h4 className="font-serif text-lg text-foreground mb-1">{p.titulo}</h4>
              <p className="text-sm text-muted-foreground">{p.texto}</p>
            </div>
          ))}
        </div>
      </OnboardingLayout>
    );
  }

  if (etapa === "producao_interna") {
    return (
      <OnboardingLayout
        etapaAtual={etapaAtual}
        totalEtapas={totalEtapas}
        modo={modo}
        tituloDestaque="Custo da sua produção interna."
        descricaoDireita="Transforma a folha de pagamento da sua equipe em um custo por peça, para somar ao custo de insumos e serviços terceirizados."
        podeContinuar
        aoVoltar={aoVoltar}
        aoContinuar={() => salvarEAvancar({}, "regime")}
        proximoTexto="Próximo: regime tributário padrão"
        carregando={salvar.isPending}
      >
        <div className="rounded-lg border border-border bg-card p-8 max-w-xl">
          <h3 className="font-serif text-2xl text-foreground mb-3">Como funciona.</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Você marcou que produz {rascunho.modelo_producao === "misto" ? "parte" : "tudo"} internamente — por isso
            liberamos um menu novo, <strong>"Produção interna"</strong>, com três passos:
          </p>
          <div className="flex flex-col gap-3 mb-3">
            <div className="rounded-md bg-muted p-4">
              <p className="text-sm font-medium text-foreground mb-1">1. Cadastre os cargos da equipe</p>
              <p className="text-xs text-muted-foreground">
                Costureira, cortador, passadeira... com salário, encargos (CLT) e benefícios. O sistema já sugere um %
                de encargos com base no seu regime tributário — você pode ajustar.
              </p>
            </div>
            <div className="rounded-md bg-muted p-4">
              <p className="text-sm font-medium text-foreground mb-1">2. Informe a capacidade mensal da equipe</p>
              <p className="text-xs text-muted-foreground">
                Um número único: quantas peças a equipe inteira produz por mês em ritmo normal.
              </p>
            </div>
            <div className="rounded-md bg-muted p-4">
              <p className="text-sm font-medium text-foreground mb-1">3. Use o custo por peça calculado</p>
              <p className="text-xs text-muted-foreground">
                Ao lançar um produto novo, você pode incluir esse custo de mão de obra própria — o sistema divide a
                folha mensal pela capacidade e soma ao custo de insumos e serviços terceirizados.
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Você não precisa preencher isso agora — pode voltar para "Produção interna" no menu quando quiser.
          </p>
        </div>
      </OnboardingLayout>
    );
  }

  if (etapa === "regime") {
    const opcoes: { valor: string; descricao: string }[] = [
      { valor: "simples_nacional", descricao: "Sem crédito — o preço pago já é o custo real. Mais comum para micro e pequenas confecções hoje." },
      { valor: "lucro_presumido_real", descricao: "Já dá para recuperar parte do imposto pago no insumo." },
      { valor: "iva_dual_2027", descricao: "A partir da reforma tributária, crédito amplo sobre a compra (CBS/IBS)." },
    ];
    return (
      <OnboardingLayout
        etapaAtual={etapaAtual}
        totalEtapas={totalEtapas}
        modo={modo}
        tituloDestaque="Regime tributário padrão."
        descricaoDireita="Usado como sugestão inicial ao registrar uma compra de insumo — você pode trocar em cada compra."
        podeContinuar={!!rascunho.regime_tributario_padrao}
        aoVoltar={aoVoltar}
        aoContinuar={() => salvarEAvancar(rascunho, "final")}
        proximoTexto="Última etapa"
        carregando={salvar.isPending}
      >
        <div>
          <SectionTitle title="Qual regime melhor descreve sua empresa hoje?" />
          <div className="mt-4 flex flex-col gap-3 max-w-lg">
            {opcoes.map((o) => (
              <RadioCard
                key={o.valor}
                title={REGIME_LABELS[o.valor]}
                description={o.descricao}
                selected={(rascunho.regime_tributario_padrao ?? "simples_nacional") === o.valor}
                onSelect={() => atualizar("regime_tributario_padrao", o.valor)}
              />
            ))}
          </div>
        </div>
      </OnboardingLayout>
    );
  }

  if (modo === "configuracoes") {
    return (
      <OnboardingLayout
        etapaAtual={etapaAtual}
        totalEtapas={totalEtapas}
        modo={modo}
        tituloDestaque="Revise e salve."
        descricaoDireita="Suas respostas ficam salvas — pode voltar aqui em Configurações sempre que precisar ajustar algo."
        podeContinuar
        aoVoltar={aoVoltar}
        textoBotao="Salvar e voltar ao Início →"
        aoContinuar={() => salvarEAvancar(rascunho, null)}
        carregando={salvar.isPending}
      >
        <div className="rounded-lg border border-border bg-card p-8 max-w-xl">
          <h3 className="font-serif text-2xl text-foreground mb-3">
            {rascunho.nome_marca ? `Tudo certo, ${rascunho.nome_marca}.` : "Tudo certo."}
          </h3>
          <p className="text-sm text-muted-foreground">
            Confira as respostas nas etapas anteriores usando "Voltar" e clique em salvar quando terminar.
          </p>
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout
      etapaAtual={etapaAtual}
      totalEtapas={totalEtapas}
        modo={modo}
      tituloDestaque="Pronto para começar."
      descricaoDireita="Seu perfil fica em Configurações — pode ajustar quando quiser."
      podeContinuar
      aoVoltar={aoVoltar}
      textoBotao="Ir para o Início →"
      aoContinuar={() => salvarEAvancar({ onboarding_concluido: true }, null)}
      carregando={salvar.isPending}
    >
      <div className="rounded-lg border border-border bg-card p-8 max-w-xl">
        <h3 className="font-serif text-2xl text-foreground mb-3">
          {rascunho.nome_marca ? `Tudo pronto, ${rascunho.nome_marca}.` : "Tudo pronto."}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          O primeiro passo real é cadastrar um insumo — fornecedor, material e o preço que você pagou. A partir daí o sistema já
          calcula o preço por metro e fica pronto para entrar num produto.
        </p>
        <p className="text-sm text-muted-foreground">
          Se quiser importar uma planilha com vários insumos de uma vez, a opção "Importar planilha" está no topo da tela de
          Insumos.
        </p>
      </div>
    </OnboardingLayout>
  );
}
