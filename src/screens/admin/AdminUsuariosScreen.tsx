import { useEffect, useState } from "react";
import { Button, Card, Field, Input, PageTitle } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/format";

/**
 * Painel temporário da fase de testes — cria login com senha temporária,
 * sem confirmação de e-mail. A trava real é na Edge Function (allowlist
 * server-side); isto aqui só evita que alguém sem permissão veja o
 * formulário por engano.
 */
const EMAILS_AUTORIZADOS = ["vanessa.ugulino@gmail.com", "emyli@thefashionoffice.com.br"];

interface UsuarioAdmin {
  id: string;
  email: string;
  criadoEm: string;
  ultimoAcesso: string | null;
  senhaTemporaria: boolean;
}

interface SenhaGerada {
  email: string;
  senha: string;
}

export function AdminUsuariosScreen() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetandoId, setResetandoId] = useState<string | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [senhaGerada, setSenhaGerada] = useState<SenhaGerada | null>(null);
  const [copiado, setCopiado] = useState(false);

  const autorizado = !!user?.email && EMAILS_AUTORIZADOS.includes(user.email);

  useEffect(() => {
    if (autorizado) carregarUsuarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autorizado]);

  async function carregarUsuarios() {
    setCarregandoLista(true);
    const { data, error } = await supabase.functions.invoke<{ usuarios: UsuarioAdmin[]; error?: string }>(
      "admin-listar-usuarios",
    );
    setCarregandoLista(false);
    if (!error && !data?.error && data) setUsuarios(data.usuarios);
  }

  if (!autorizado) {
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
      setSenhaGerada({ email: data.email, senha: data.senha });
      setEmail("");
      carregarUsuarios();
    }
  }

  async function handleResetar(u: UsuarioAdmin) {
    const ok = window.confirm(`Gerar nova senha temporária para ${u.email}? A senha atual dele deixa de funcionar.`);
    if (!ok) return;
    setResetandoId(u.id);
    setErro(null);
    const { data, error } = await supabase.functions.invoke<{ senha: string; error?: string }>("admin-resetar-senha", {
      body: { userId: u.id },
    });
    setResetandoId(null);
    if (error || data?.error) {
      setErro(data?.error ?? error?.message ?? "Não foi possível resetar a senha.");
      return;
    }
    if (data) {
      setSenhaGerada({ email: u.email, senha: data.senha });
      carregarUsuarios();
    }
  }

  async function copiarSenha() {
    if (!senhaGerada) return;
    await navigator.clipboard.writeText(senhaGerada.senha);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  }

  return (
    <div>
      <PageTitle
        title="Usuários de teste"
        subtitle="Painel temporário da fase de testes — a senha só aparece uma vez, na hora de criar ou resetar. Copie e envie ao cliente antes de sair desta tela."
      />

      <Card className="mb-6 max-w-lg">
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

      {senhaGerada && (
        <Card className="mb-6 max-w-lg border-primary/40">
          <h2 className="mb-1 text-sm font-semibold">Senha temporária de {senhaGerada.email}</h2>
          <p className="mb-3 text-xs text-muted-foreground">Copie e envie agora — ela não aparece de novo depois que você sair desta tela.</p>
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-muted px-3 py-1.5 font-mono text-sm">{senhaGerada.senha}</span>
            <Button type="button" variant="secondary" onClick={copiarSenha}>
              {copiado ? "Copiado!" : "Copiar senha"}
            </Button>
            <button type="button" className="text-sm text-muted-foreground underline" onClick={() => setSenhaGerada(null)}>
              Fechar
            </button>
          </div>
        </Card>
      )}

      <Card className="max-w-2xl">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Todos os usuários</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 pr-4">E-mail</th>
              <th className="py-2 pr-4">Criado em</th>
              <th className="py-2 pr-4">Último acesso</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4" />
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-b border-border/60">
                <td className="py-2 pr-4">{u.email}</td>
                <td className="py-2 pr-4">{formatDate(u.criadoEm)}</td>
                <td className="py-2 pr-4">{u.ultimoAcesso ? formatDate(u.ultimoAcesso) : "Nunca entrou"}</td>
                <td className="py-2 pr-4">
                  {u.senhaTemporaria ? (
                    <span className="text-xs text-muted-foreground">Aguardando 1º acesso</span>
                  ) : (
                    <span className="text-xs text-success">Senha definida</span>
                  )}
                </td>
                <td className="py-2 pr-4">
                  <button
                    type="button"
                    className="underline text-muted-foreground disabled:opacity-50"
                    disabled={resetandoId === u.id}
                    onClick={() => handleResetar(u)}
                  >
                    {resetandoId === u.id ? "Resetando..." : "Resetar senha"}
                  </button>
                </td>
              </tr>
            ))}
            {!carregandoLista && usuarios.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-muted-foreground">
                  Nenhum usuário ainda.
                </td>
              </tr>
            )}
            {carregandoLista && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-muted-foreground">
                  Carregando...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
