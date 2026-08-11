import { useCallback, useRef, useState } from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { Button, Select } from "@/components/ui";
import { sugerirCampo, type ModeloImport } from "@/lib/importFields";

type Passo = "upload" | "mapeamento" | "resultado";

interface ParsedFile {
  colunas: string[];
  linhas: string[][];
}

export interface ResultadoImport {
  sucesso: number;
  erros: { linha: number; motivo: string }[];
}

interface ImportModalProps {
  modelo: ModeloImport;
  onClose: () => void;
  onConfirmar: (linhas: Record<string, string>[]) => Promise<ResultadoImport>;
}

export function ImportModal({ modelo, onClose, onConfirmar }: ImportModalProps) {
  const [passo, setPasso] = useState<Passo>("upload");
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [mapeamento, setMapeamento] = useState<Record<string, string>>({});
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImport | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setErroArquivo(null);
      const ext = file.name.split(".").pop()?.toLowerCase();
      let rows: string[][] = [];

      if (ext === "csv") {
        const text = await file.text();
        const result = Papa.parse<string[]>(text, { header: false, skipEmptyLines: true });
        rows = result.data as string[][];
      } else if (ext === "xlsx" || ext === "xls") {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "" }) as string[][];
      } else {
        setErroArquivo("Formato não suportado. Use .xlsx, .xls ou .csv");
        return;
      }

      if (rows.length < 2) {
        setErroArquivo("Arquivo vazio ou sem linhas de dados.");
        return;
      }

      const colunas = rows[0].map(String);
      const linhas = rows.slice(1).filter((r) => r.some((c) => String(c).trim())).map((r) => r.map(String));
      const mapeamentoInicial: Record<string, string> = {};
      colunas.forEach((col, i) => {
        mapeamentoInicial[String(i)] = sugerirCampo(col, modelo.campos);
      });

      setParsed({ colunas, linhas });
      setMapeamento(mapeamentoInicial);
      setPasso("mapeamento");
    },
    [modelo],
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function baixarModelo() {
    const wb = XLSX.utils.book_new();
    const headers = modelo.campos.map((c) => c.label);
    const ws = XLSX.utils.aoa_to_sheet([headers, modelo.linhaExemplo]);
    XLSX.utils.book_append_sheet(wb, ws, "Modelo");
    XLSX.writeFile(wb, `modelo_${modelo.id}.xlsx`);
  }

  const camposObrigatoriosMapeados = modelo.campos
    .filter((c) => c.obrigatorio)
    .every((c) => Object.values(mapeamento).includes(c.id));

  async function handleConfirmar() {
    if (!parsed) return;
    setImportando(true);
    try {
      const linhasMapeadas: Record<string, string>[] = parsed.linhas.map((row) => {
        const obj: Record<string, string> = {};
        Object.entries(mapeamento).forEach(([colIdx, campoId]) => {
          if (campoId === "nao_importar") return;
          obj[campoId] = row[parseInt(colIdx)] ?? "";
        });
        return obj;
      });
      const res = await onConfirmar(linhasMapeadas);
      setResultado(res);
      setPasso("resultado");
    } finally {
      setImportando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-primary/40 backdrop-blur-sm overflow-y-auto py-8 px-4">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h3 className="font-serif text-lg text-foreground">Importar {modelo.label.toLowerCase()}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Formatos aceitos: .xlsx, .xls, .csv</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground text-lg">
            ✕
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {passo === "upload" && (
            <>
              <button type="button" onClick={baixarModelo} className="self-start text-sm underline text-secondary">
                Baixar planilha modelo (.xlsx)
              </button>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-secondary rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:bg-muted/40 transition-all"
              >
                <span className="text-3xl">📂</span>
                <p className="text-sm font-medium text-foreground text-center">Arraste o arquivo aqui ou clique para selecionar</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFile(e.target.files[0]);
                  }}
                />
              </div>
              {erroArquivo && <div className="text-sm text-destructive">{erroArquivo}</div>}
            </>
          )}

          {passo === "mapeamento" && parsed && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                {parsed.colunas.length} colunas · {parsed.linhas.length} linhas. Confira o de-para de cada coluna abaixo.
              </p>
              <div className="flex flex-col gap-2 max-h-72 overflow-auto">
                {parsed.colunas.map((col, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{col || `Coluna ${i + 1}`}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        Ex: {parsed.linhas.slice(0, 2).map((r) => r[i] || "—").join(" · ")}
                      </div>
                    </div>
                    <Select
                      value={mapeamento[String(i)] ?? "nao_importar"}
                      onChange={(e) => setMapeamento((prev) => ({ ...prev, [String(i)]: e.target.value }))}
                      className="w-56 shrink-0"
                    >
                      <option value="nao_importar">Não importar</option>
                      {modelo.campos.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                          {c.obrigatorio ? " *" : ""}
                        </option>
                      ))}
                    </Select>
                  </div>
                ))}
              </div>

              {!camposObrigatoriosMapeados && (
                <div className="text-sm text-destructive">
                  Mapeie todos os campos obrigatórios (*): {modelo.campos.filter((c) => c.obrigatorio).map((c) => c.label).join(", ")}
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setPasso("upload")}>
                  ← Voltar
                </Button>
                <Button className="flex-1" onClick={handleConfirmar} disabled={!camposObrigatoriosMapeados || importando}>
                  {importando ? "Importando..." : `Importar ${parsed.linhas.length} linhas`}
                </Button>
              </div>
            </div>
          )}

          {passo === "resultado" && resultado && (
            <div className="flex flex-col gap-4">
              <div className="rounded-md bg-success/10 text-success px-4 py-3 text-sm">
                ✓ {resultado.sucesso} linha(s) importada(s) com sucesso.
              </div>
              {resultado.erros.length > 0 && (
                <div className="rounded-md bg-destructive/10 text-destructive px-4 py-3 text-sm">
                  <p className="font-medium mb-1">{resultado.erros.length} linha(s) com problema:</p>
                  <ul className="list-disc pl-5">
                    {resultado.erros.slice(0, 8).map((e, i) => (
                      <li key={i}>
                        Linha {e.linha}: {e.motivo}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <Button onClick={onClose}>Concluir</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
