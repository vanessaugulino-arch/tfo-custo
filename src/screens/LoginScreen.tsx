import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button, Field, Input } from "@/components/ui";

export function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setAviso(null);
    setLoading(true);
    try {
      if (modo === "entrar") {
        const { error } = await signIn(email, senha);
        if (error) setErro(traduzErro(error));
      } else {
        const { error, needsConfirmation } = await signUp(email, senha);
        if (error) setErro(traduzErro(error));
        else if (needsConfirmation) setAviso("Conta criada! Confirme seu e-mail para entrar (verifique a caixa de entrada).");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif text-foreground">TFO Custos</h1>
          <p className="text-sm text-muted-foreground mt-1">Custo de produto, do insumo ao preço.</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex mb-5 rounded-md bg-muted p-1 text-sm">
            <button
              type="button"
              onClick={() => {
                setModo("entrar");
                setErro(null);
                setAviso(null);
              }}
              className={`flex-1 rounded px-3 py-1.5 font-medium transition-colors ${modo === "entrar" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                setModo("criar");
                setErro(null);
                setAviso(null);
              }}
              className={`flex-1 rounded px-3 py-1.5 font-medium transition-colors ${modo === "criar" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
            >
              Criar conta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="E-mail">
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
            </Field>
            <Field label="Senha">
              <Input
                type="password"
                required
                minLength={6}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </Field>

            {erro && <div className="text-sm text-destructive">{erro}</div>}
            {aviso && <div className="text-sm text-success">{aviso}</div>}

            <Button type="submit" disabled={loading} className="w-full mt-1">
              {loading ? "Aguarde..." : modo === "entrar" ? "Entrar" : "Criar conta"}
            </Button>
          </form>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6">
          {modo === "entrar" ? "Primeira vez por aqui? " : "Já tem conta? "}
          <button
            type="button"
            className="underline"
            onClick={() => setModo(modo === "entrar" ? "criar" : "entrar")}
          >
            {modo === "entrar" ? "Criar conta" : "Entrar"}
          </button>
        </p>
      </div>
    </div>
  );
}

function traduzErro(msg: string): string {
  if (msg.includes("Invalid login credentials")) return "E-mail ou senha incorretos.";
  if (msg.includes("User already registered")) return "Já existe uma conta com esse e-mail. Tente entrar.";
  if (msg.includes("Password should be")) return "A senha precisa ter pelo menos 6 caracteres.";
  return msg;
}
