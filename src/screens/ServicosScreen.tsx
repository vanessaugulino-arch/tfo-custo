import { useState } from "react";
import { Combobox } from "@/components/Combobox";
import { ComboboxMulti } from "@/components/ComboboxMulti";
import { ImportModal, type ResultadoImport } from "@/components/ImportModal";
import { InfoTooltip } from "@/components/InfoTooltip";
import { Badge, Button, Card, Field, Input, PageTitle, Select } from "@/components/ui";
import {
  useCategorias,
  useCreateCategoria,
  useCreateFornecedor,
  useCreateServico,
  useCreateServicoFornecedor,
  useFornecedores,
  useServicos,
  useServicosFornecedor,
} from "@/hooks/useData";
import { findOrCreateCategoria, findOrCreateFornecedor, findOrCreateServico, parseNumeroPtBr } from "@/lib/importHelpers";
import { MODELO_SERVICOS } from "@/lib/importFields";
import { formatBRL, MODELO_PRECIFICACAO_LABELS } from "@/lib/format";

const MODELOS = Object.entries(MODELO_PRECIFICACAO_LABELS) as ["peca" | "tempo" | "produto", string][];
const MODELOS_VALIDOS = new Set(["peca", "tempo", "produto"]);

export function ServicosScreen() {
  const { data: fornecedores = [] } = useFornecedores();
  const { data: servicos = [] } = useServicos();
  const { data: categorias = [] } = useCategorias();
  const { data: servicosFornecedor = [] } = useServicosFornecedor();
  const createFornecedor = useCreateFornecedor();
  const createServico = useCreateServico();
  const createCategoria = useCreateCategoria();
  const createServicoFornecedor = useCreateServicoFornecedor();
  const [importAberto, setImportAberto] = useState(false);

  async function handleImportar(linhas: Record<string, string>[]): Promise<ResultadoImport> {
    let sucesso = 0;
    const erros: ResultadoImport["erros"] = [];
    for (let i = 0; i < linhas.length; i++) {
      const row = linhas[i];
      try {
        if (!row.fornecedor?.trim() || !row.servico?.trim()) throw new Error("fornecedor ou serviço vazio");
        const modeloRow = row.modelo_precificacao?.trim().toLowerCase();
        if (!MODELOS_VALIDOS.has(modeloRow)) throw new Error("modelo de precificação inválido (use peca, tempo ou produto)");
        const custoPorMinuto = modeloRow === "tempo" ? parseNumeroPtBr(row.custo_por_minuto) : null;
        if (modeloRow === "tempo" && !(Number(custoPorMinuto) > 0)) throw new Error("custo por minuto obrigatório para o modelo 'tempo'");

        const fornecedorId = await findOrCreateFornecedor(row.fornecedor);
        const servicoId = await findOrCreateServico(row.servico);
        const nomesCategorias = (row.categorias ?? "").split(",").map((s) => s.trim()).filter(Boolean);
        const categoriaIdsRow: string[] = [];
        for (const nome of nomesCategorias) categoriaIdsRow.push(await findOrCreateCategoria(nome));

        await createServicoFornecedor.mutateAsync({
          fornecedorId,
          servicoId,
          modeloPrecificacao: modeloRow as "peca" | "tempo" | "produto",
          custoPorMinuto,
          categoriaIds: categoriaIdsRow,
        });
        sucesso++;
      } catch (err) {
        erros.push({ linha: i + 2, motivo: err instanceof Error ? err.message : String(err) });
      }
    }
    return { sucesso, erros };
  }

  const [fornecedorId, setFornecedorId] = useState<string | null>(null);
  const [servicoId, setServicoId] = useState<string | null>(null);
  const [categoriaIds, setCategoriaIds] = useState<string[]>([]);
  const [modelo, setModelo] = useState<"peca" | "tempo" | "produto">("peca");
  const [custoPorMinuto, setCustoPorMinuto] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!fornecedorId || !servicoId) {
      setErro("Selecione ou crie um fornecedor e um tipo de serviço.");
      return;
    }
    if (modelo === "tempo" && (!custoPorMinuto || Number(custoPorMinuto) <= 0)) {
      setErro("Informe o custo por minuto de produção.");
      return;
    }
    await createServicoFornecedor.mutateAsync({
      fornecedorId,
      servicoId,
      modeloPrecificacao: modelo,
      custoPorMinuto: modelo === "tempo" ? Number(custoPorMinuto) : null,
      categoriaIds,
    });
    setCategoriaIds([]);
    setCustoPorMinuto("");
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <PageTitle
          title="Serviços"
          subtitle="Modelagem, corte, costura e outros serviços contratados de terceiros — o preço efetivo é lançado depois, na tela de produto."
        />
        <Button variant="secondary" onClick={() => setImportAberto(true)}>
          Importar planilha
        </Button>
      </div>

      {importAberto && (
        <ImportModal modelo={MODELO_SERVICOS} onClose={() => setImportAberto(false)} onConfirmar={handleImportar} />
      )}

      <Card className="mb-8">
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <Field label="Fornecedor">
            <Combobox
              options={fornecedores.map((f) => ({ id: f.id, label: `${f.nome}${f.codigo ? ` (${f.codigo})` : ""}` }))}
              value={fornecedorId}
              onChange={setFornecedorId}
              onCreate={async (nome) => (await createFornecedor.mutateAsync(nome)).id}
              placeholder="Selecionar ou cadastrar fornecedor..."
            />
          </Field>
          <Field label="Tipo de serviço">
            <Combobox
              options={servicos.map((s) => ({ id: s.id, label: `${s.nome}${s.codigo ? ` (${s.codigo})` : ""}` }))}
              value={servicoId}
              onChange={setServicoId}
              onCreate={async (nome) => (await createServico.mutateAsync(nome)).id}
              placeholder="Selecionar ou cadastrar serviço..."
            />
          </Field>

          <Field
            label="Categorias de produto atendidas"
            hint={
              <InfoTooltip>
                Categorias como "Camisa" ou "Calça" — as mesmas usadas na tela de produto. Digite para selecionar uma já
                existente ou criar uma nova, sem sair desta tela.
              </InfoTooltip>
            }
          >
            <ComboboxMulti
              options={categorias.map((c) => ({ id: c.id, label: c.nome }))}
              values={categoriaIds}
              onChange={setCategoriaIds}
              onCreate={async (nome) => (await createCategoria.mutateAsync(nome)).id}
              placeholder="Selecionar ou criar categorias..."
            />
          </Field>
          <Field
            label="Modelo de precificação"
            hint={
              <InfoTooltip>
                <strong>Peça desenvolvida:</strong> valor único, dividido pela quantidade produzida (ex: modelagem).
                <br />
                <strong>Tempo:</strong> custo por minuto × tempo gasto (ex: costura cronometrada).
                <br />
                <strong>Produto produzido:</strong> valor fixo por peça, não dilui (ex: corte cobrado por unidade).
              </InfoTooltip>
            }
          >
            <Select value={modelo} onChange={(e) => setModelo(e.target.value as any)}>
              {MODELOS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>

          {modelo === "tempo" && (
            <Field label="Custo por minuto de produção (R$)">
              <Input type="number" min="0" step="any" value={custoPorMinuto} onChange={(e) => setCustoPorMinuto(e.target.value)} />
            </Field>
          )}
          {modelo !== "tempo" && (
            <div className="flex items-end text-sm text-muted-foreground">
              {modelo === "peca"
                ? "O valor cobrado é lançado por peça, na tela de produto (não depende do volume produzido)."
                : "O preço é o último valor já pago a este fornecedor, por categoria — lançado na tela de produto."}
            </div>
          )}

          {erro && <div className="col-span-2 text-sm text-destructive">{erro}</div>}

          <div className="col-span-2">
            <Button type="submit" disabled={createServicoFornecedor.isPending}>
              {createServicoFornecedor.isPending ? "Salvando..." : "Cadastrar serviço"}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Serviços cadastrados</h2>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-4">Fornecedor</th>
                <th className="py-2 pr-4">Serviço</th>
                <th className="py-2 pr-4">Categorias</th>
                <th className="py-2 pr-4">Modelo</th>
                <th className="py-2 pr-4">Custo/minuto</th>
              </tr>
            </thead>
            <tbody>
              {servicosFornecedor.map((sf) => (
                <tr key={sf.id} className="border-b border-border/60">
                  <td className="py-2 pr-4">{sf.fornecedor?.nome}</td>
                  <td className="py-2 pr-4">{sf.servico?.nome}</td>
                  <td className="py-2 pr-4">
                    <div className="flex flex-wrap gap-1">
                      {sf.categorias.map((c) => (
                        <Badge key={c.id}>{c.nome}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="py-2 pr-4">{MODELO_PRECIFICACAO_LABELS[sf.modelo_precificacao]}</td>
                  <td className="py-2 pr-4">{sf.custo_por_minuto ? formatBRL(sf.custo_por_minuto) : "—"}</td>
                </tr>
              ))}
              {servicosFornecedor.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted-foreground">
                    Nenhum serviço cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
