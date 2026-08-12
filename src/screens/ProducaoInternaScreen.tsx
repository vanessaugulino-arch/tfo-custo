import { useState } from "react";
import { InfoTooltip } from "@/components/InfoTooltip";
import { Tour, useTourAutoShow, type TourStep } from "@/components/Tour";
import { Button, Card, Field, Input, PageTitle } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import {
  useCargosProducao,
  useCreateCargo,
  usePerfilNegocio,
  useRemoverCargo,
  useSalvarPerfilNegocio,
  useUpdateCargo,
} from "@/hooks/useData";
import { custoMensalCargo, custoProducaoInternaPorPeca } from "@/engine/custo";
import { ENCARGOS_SUGERIDOS, formatBRL, formatNumber } from "@/lib/format";

const CARGO_VAZIO = { nome: "", salarioBase: "", encargosPct: "", beneficiosMensal: "0", quantidadePessoas: "1" };

const TOUR_STEPS: TourStep[] = [
  {
    targetId: "producao-cargos",
    title: "Cadastre cada função da equipe",
    texto:
      "Some salário, encargos (CLT) e benefícios por cargo. O sistema já sugere um % de encargos com base no seu regime tributário — você pode ajustar se souber o valor real.",
  },
  {
    targetId: "producao-capacidade",
    title: "Capacidade é um número só, para a equipe toda",
    texto: "Não é por cargo — é quantas peças a linha inteira produz por mês, no ritmo normal.",
  },
  {
    targetId: "producao-simulador",
    title: "Simule o custo por peça",
    texto:
      "Informe quanto pretende produzir para ver o custo de mão de obra por peça. O ajuste de capacidade é opcional — serve para simular hora extra ou absenteísmo sem alterar a capacidade base salva.",
  },
];

export function ProducaoInternaScreen() {
  const { user } = useAuth();
  const { data: perfil } = usePerfilNegocio(user?.id);
  const { data: cargos = [] } = useCargosProducao();
  const createCargo = useCreateCargo();
  const updateCargo = useUpdateCargo();
  const removerCargo = useRemoverCargo();
  const salvarPerfil = useSalvarPerfilNegocio();
  const tour = useTourAutoShow("producao_interna");

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(CARGO_VAZIO);
  const [erro, setErro] = useState<string | null>(null);

  const [capacidade, setCapacidade] = useState(perfil?.capacidade_mensal_pecas != null ? String(perfil.capacidade_mensal_pecas) : "");
  const [capacidadeSalva, setCapacidadeSalva] = useState(false);

  const [simQuantidade, setSimQuantidade] = useState("");
  const [simAjustePct, setSimAjustePct] = useState("0");

  const encargosSugerido = perfil?.regime_tributario_padrao ? ENCARGOS_SUGERIDOS[perfil.regime_tributario_padrao] : undefined;

  const podeUsar = perfil?.modelo_producao === "propria" || perfil?.modelo_producao === "misto";

  const folhaMensalTotal = cargos.reduce(
    (acc, c) =>
      acc +
      custoMensalCargo({
        salarioBase: c.salario_base,
        encargosPct: c.encargos_pct,
        beneficiosMensal: c.beneficios_mensal,
        quantidadePessoas: c.quantidade_pessoas,
      }),
    0,
  );

  const capacidadeNum = Number(capacidade) || 0;
  const simQuantidadeNum = Number(simQuantidade) || 0;
  const simAjusteNum = Number(simAjustePct) || 0;
  const resultado = custoProducaoInternaPorPeca(folhaMensalTotal, capacidadeNum, simAjusteNum, simQuantidadeNum);

  function iniciarEdicao(cargo: (typeof cargos)[number]) {
    setEditandoId(cargo.id);
    setForm({
      nome: cargo.nome,
      salarioBase: String(cargo.salario_base),
      encargosPct: String(cargo.encargos_pct),
      beneficiosMensal: String(cargo.beneficios_mensal),
      quantidadePessoas: String(cargo.quantidade_pessoas),
    });
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setForm(CARGO_VAZIO);
  }

  async function handleSalvarCargo(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!form.nome.trim()) {
      setErro("Dê um nome ao cargo (ex: Costureira, Cortador).");
      return;
    }
    const payload = {
      nome: form.nome.trim(),
      salarioBase: Number(form.salarioBase) || 0,
      encargosPct: Number(form.encargosPct) || 0,
      beneficiosMensal: Number(form.beneficiosMensal) || 0,
      quantidadePessoas: Math.max(1, Number(form.quantidadePessoas) || 1),
    };
    if (editandoId) {
      await updateCargo.mutateAsync({ id: editandoId, ...payload });
    } else {
      await createCargo.mutateAsync(payload);
    }
    cancelarEdicao();
  }

  async function handleSalvarCapacidade() {
    if (!user) return;
    await salvarPerfil.mutateAsync({ userId: user.id, capacidade_mensal_pecas: capacidadeNum });
    setCapacidadeSalva(true);
    setTimeout(() => setCapacidadeSalva(false), 2000);
  }

  if (!podeUsar) {
    return (
      <div>
        <PageTitle title="Produção interna" subtitle="Custo de mão de obra própria (equipe interna ou ateliê)." />
        <Card>
          <p className="text-sm text-muted-foreground">
            Este módulo é para marcas com produção própria ou mista. No seu perfil, o modelo de produção está marcado
            como "terceirizada" — se isso mudou, ajuste em Configurações para liberar esta tela.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="pb-16">
      <div className="flex items-start justify-between gap-4">
        <PageTitle
          title="Produção interna"
          subtitle="Transforme a folha de pagamento da sua equipe em um custo por peça, para somar ao custo de insumos e serviços terceirizados."
        />
        <Button variant="ghost" onClick={tour.abrir}>
          Tour desta tela
        </Button>
      </div>
      <Tour steps={TOUR_STEPS} aberto={tour.aberto} onFechar={tour.fechar} />

      <Card className="mb-6" data-tour="producao-cargos">
        <h2 className="mb-1 text-sm font-semibold text-muted-foreground">Cargos da equipe</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Cadastre cada função (costureira, cortador, passadeira...) com o salário e os encargos. O sistema soma tudo
          numa folha mensal total.
        </p>

        <form onSubmit={handleSalvarCargo} className="grid grid-cols-5 gap-3 items-end mb-4">
          <Field label="Cargo">
            <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="ex: Costureira" />
          </Field>
          <Field label="Salário base (R$)">
            <Input
              type="number"
              min="0"
              step="any"
              value={form.salarioBase}
              onChange={(e) => setForm((f) => ({ ...f, salarioBase: e.target.value }))}
            />
          </Field>
          <Field
            label="Encargos (%)"
            hint={
              <InfoTooltip>
                Encargos trabalhistas (FGTS, 13º, férias, e no Lucro Presumido/Real também INSS patronal). Sugerimos{" "}
                {encargosSugerido ?? 32}% com base no seu regime tributário — é só um ponto de partida, ajuste se souber
                o valor real da sua folha.
              </InfoTooltip>
            }
          >
            <Input
              type="number"
              min="0"
              step="any"
              value={form.encargosPct}
              onChange={(e) => setForm((f) => ({ ...f, encargosPct: e.target.value }))}
              placeholder={encargosSugerido ? String(encargosSugerido) : "32"}
            />
          </Field>
          <Field
            label="Benefícios/mês (R$)"
            hint={<InfoTooltip>Vale-transporte, vale-refeição, plano de saúde etc. — some por pessoa, valor fixo mensal.</InfoTooltip>}
          >
            <Input
              type="number"
              min="0"
              step="any"
              value={form.beneficiosMensal}
              onChange={(e) => setForm((f) => ({ ...f, beneficiosMensal: e.target.value }))}
            />
          </Field>
          <Field label="Nº de pessoas">
            <Input
              type="number"
              min="1"
              step="1"
              value={form.quantidadePessoas}
              onChange={(e) => setForm((f) => ({ ...f, quantidadePessoas: e.target.value }))}
            />
          </Field>

          {erro && <div className="col-span-5 text-sm text-destructive">{erro}</div>}

          <div className="col-span-5 flex gap-2">
            <Button type="submit" disabled={createCargo.isPending || updateCargo.isPending}>
              {editandoId ? "Salvar alterações" : "Adicionar cargo"}
            </Button>
            {editandoId && (
              <Button type="button" variant="ghost" onClick={cancelarEdicao}>
                Cancelar
              </Button>
            )}
          </div>
        </form>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 pr-4">Cargo</th>
              <th className="py-2 pr-4">Salário base</th>
              <th className="py-2 pr-4">Encargos</th>
              <th className="py-2 pr-4">Benefícios/mês</th>
              <th className="py-2 pr-4">Pessoas</th>
              <th className="py-2 pr-4">Custo mensal do cargo</th>
              <th className="py-2 pr-4" />
            </tr>
          </thead>
          <tbody>
            {cargos.map((c) => (
              <tr key={c.id} className="border-b border-border/60">
                <td className="py-2 pr-4">{c.nome}</td>
                <td className="py-2 pr-4">{formatBRL(c.salario_base)}</td>
                <td className="py-2 pr-4">{formatNumber(c.encargos_pct)}%</td>
                <td className="py-2 pr-4">{formatBRL(c.beneficios_mensal)}</td>
                <td className="py-2 pr-4">{c.quantidade_pessoas}</td>
                <td className="py-2 pr-4 font-medium">
                  {formatBRL(
                    custoMensalCargo({
                      salarioBase: c.salario_base,
                      encargosPct: c.encargos_pct,
                      beneficiosMensal: c.beneficios_mensal,
                      quantidadePessoas: c.quantidade_pessoas,
                    }),
                  )}
                </td>
                <td className="py-2 pr-4">
                  <div className="flex gap-3">
                    <button type="button" className="underline" onClick={() => iniciarEdicao(c)}>
                      Editar
                    </button>
                    <button type="button" className="text-destructive" onClick={() => removerCargo.mutate(c.id)}>
                      Remover
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {cargos.length === 0 && (
              <tr>
                <td colSpan={7} className="py-4 text-center text-muted-foreground">
                  Nenhum cargo cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
          {cargos.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={5} className="py-2 pr-4 text-right font-medium">
                  Folha mensal total
                </td>
                <td className="py-2 pr-4 font-semibold">{formatBRL(folhaMensalTotal)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </Card>

      <Card className="mb-6" data-tour="producao-capacidade">
        <h2 className="mb-1 text-sm font-semibold text-muted-foreground">Capacidade de produção</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Quantas peças a sua equipe inteira consegue produzir por mês, em ritmo normal — some todos os cargos e
          etapas (corte, costura, acabamento), pelo elo mais lento da linha.
        </p>
        <div className="flex items-end gap-3">
          <Field
            label="Capacidade mensal (peças)"
            hint={
              <InfoTooltip>
                Este é um número único para toda a equipe — não por cargo. Ex: se sua linha inteira produz 800 peças/mês
                trabalhando normal, coloque 800 aqui.
              </InfoTooltip>
            }
          >
            <Input type="number" min="0" step="1" value={capacidade} onChange={(e) => setCapacidade(e.target.value)} className="w-64" />
          </Field>
          <Button type="button" variant="secondary" onClick={handleSalvarCapacidade} disabled={salvarPerfil.isPending}>
            {salvarPerfil.isPending ? "Salvando..." : "Salvar capacidade"}
          </Button>
          {capacidadeSalva && <span className="text-sm text-success">Salvo!</span>}
        </div>
      </Card>

      <Card data-tour="producao-simulador">
        <h2 className="mb-1 text-sm font-semibold text-muted-foreground">Simulador de custo por peça</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Informe quanto pretende produzir para ver o custo de mão de obra própria por peça — esse valor pode ser
          usado como referência ao lançar o produto em "Novo produto".
        </p>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <Field label="Quantidade a produzir">
            <Input type="number" min="0" step="1" value={simQuantidade} onChange={(e) => setSimQuantidade(e.target.value)} placeholder="ex: 500" />
          </Field>
          <Field
            label="Ajuste de capacidade (%)"
            hint={
              <InfoTooltip>
                Opcional. Use um número positivo para simular hora extra (ex: 20% = equipe produzindo 20% acima do
                normal por um período) ou negativo para simular absenteísmo/baixa produtividade (ex: -10%). Isso NÃO
                altera a capacidade base salva acima — é só para esta simulação.
              </InfoTooltip>
            }
          >
            <Input type="number" step="any" value={simAjustePct} onChange={(e) => setSimAjustePct(e.target.value)} placeholder="0" />
          </Field>
        </div>

        {folhaMensalTotal === 0 && (
          <div className="text-sm text-muted-foreground">Cadastre ao menos um cargo acima para simular.</div>
        )}
        {capacidadeNum === 0 && folhaMensalTotal > 0 && (
          <div className="text-sm text-muted-foreground">Informe e salve a capacidade mensal acima para simular.</div>
        )}

        {folhaMensalTotal > 0 && capacidadeNum > 0 && simQuantidadeNum > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-md bg-muted px-4 py-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                Capacidade efetiva/mês
                <InfoTooltip>Capacidade mensal já com o ajuste de horas extra/absenteísmo aplicado.</InfoTooltip>
              </div>
              <div className="text-lg font-semibold">{formatNumber(resultado.capacidadeEfetiva)} peças</div>
            </div>
            <div className="rounded-md bg-muted px-4 py-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                Meses necessários
                <InfoTooltip>Quantidade a produzir ÷ capacidade efetiva — quanto tempo a equipe leva para dar conta desse volume.</InfoTooltip>
              </div>
              <div className="text-lg font-semibold">{formatNumber(resultado.mesesNecessarios)}</div>
            </div>
            <div className="rounded-md bg-muted px-4 py-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                Folha do período
                <InfoTooltip>Folha mensal total × meses necessários — quanto sua equipe custa enquanto produz esse volume.</InfoTooltip>
              </div>
              <div className="text-lg font-semibold">{formatBRL(resultado.custoTotalPeriodo)}</div>
            </div>
            <div className="rounded-md bg-accent px-4 py-3">
              <div className="text-xs text-accent-foreground/80">Custo por peça</div>
              <div className="text-lg font-semibold text-accent-foreground">{formatBRL(resultado.custoPorPeca)}</div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
