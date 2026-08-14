import { useState } from "react";
import { Button, Card, Field, Input, PageTitle } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

/**
 * Painel temporário da fase de testes — cria login com senha temporária,
 * sem confirmação de e-mail. A trava real é na Edge Function (allowlist
 * server-side); isto aqui só evita que alguém sem permissão veja o
 * formulário por engano.
 */
const EMAILS_AUTORIZADOS = ["vanessa.ugulino@gmail.com", "emyli@thefashionoffice.com.br"];

interface AcessoCriado {
  email: string;
  senha: string;
  criadoEm: string;
}

export function AdminUsuariosScreen() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [acessos, setAcessos] = useState<AcessoCriado[]>([]);
  const [copiado, setCopiado] = useState<string | null>(null);

  if (!user?.email || !EMAILS_AUTORIZADOS.includes(user.email)) {
    return (
      <Card className="max-w-md">
        <h1 className="text-base font-semibold mb-1">Acesso restrito</h1>
        <p className="text-sm text-muted-foreground">Esta tela não está disponível para o seu usuário.</p>
      </Card>
    );
  }

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!email.trim()) return;
    setLoading(true);
    const { data, error } = await supabase.functions.invoke<{ email: string; senha: string; error?: string }>(
      "admin-criar-usuario",
      { body: { email: email.trim() } },
    );
    setLoading(false);
    if (error || data?.error) {
      setErro(data?.error ?? error?.message ?? "Não foi possível criar o acesso.");
      return;
    }
    if (data) {
      setAcessos((prev) => [{ email: data.email, senha: data.senha, criadoEm: new Date().toLocaleString("pt-BR") }, ...prev]);
      setEmail("");
    }
  }

  async function copiar(texto: string, chave: string) {
    await navigator.clipboard.writeText(texto);
    setCopiado(chave);
    setTimeout(() => setCopiado(null), 1500);
  }

  return (
    <div>
      <PageTitle
        title="Criar acesso de teste"
        subtitle="Painel temporário da fase de testes — cada senha só aparece aqui uma vez. Copie e envie ao cliente antes de sair desta tela."
      />

      <Card className="mb-8 max-w-lg">
        <form onSubmit={handleCriar} className="flex gap-3 items-end">
          <Field label="E-mail do cliente" className="flex-1">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@empresa.com" />
          </Field>
          <Button type="submit" disabled={loading}>
            {loading ? "Criando..." : "Criar acesso"}
          </Button>
        </form>
        {erro && <div className="mt-3 text-sm text-destructive">{erro}</div>}
      </Card>

      {acessos.length > 0 && (
        <Card className="max-w-lg">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Criados nesta sessão</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-4">E-mail</th>
                <th className="py-2 pr-4">Senha temporária</th>
                <th className="py-2 pr-4" />
              </tr>
            </thead>
            <tbody>
              {acessos.map((a) => (
                <tr key={a.email + a.criadoEm} className="border-b border-border/60">
                  <td className="py-2 pr-4">{a.email}</td>
                  <td className="py-2 pr-4 font-mono">{a.senha}</td>
                  <td className="py-2 pr-4">
                    <button type="button" className="underline text-muted-foreground" onClick={() => copiar(a.senha, a.email)}>
                      {copiado === a.email ? "Copiado!" : "Copiar senha"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
