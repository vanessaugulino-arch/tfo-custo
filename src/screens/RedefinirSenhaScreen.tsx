import { useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { Button, Field, Input } from "@/components/ui";
import { supabase } from "@/lib/supabase";

export function RedefinirSenhaScreen() {
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmar) {
      setErro("As senhas não são iguais.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: senha,
      data: { senha_temporaria: false },
    });
    setLoading(false);
    if (error) setErro(error.message);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center">
            <BrandLogo size="lg" theme="light" />
          </div>
          <p className="text-sm text-muted-foreground mt-2">Defina sua senha para continuar.</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h1 className="mb-1 text-base font-semibold">Primeiro acesso</h1>
          <p className="mb-5 text-sm text-muted-foreground">
            Você entrou com uma senha temporária. Escolha uma senha nova antes de continuar.
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Nova senha">
              <Input
                type="password"
                required
                minLength={6}
                autoFocus
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </Field>
            <Field label="Confirmar nova senha">
              <Input
                type="password"
                required
                minLength={6}
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
              />
            </Field>

            {erro && <div className="text-sm text-destructive">{erro}</div>}

            <Button type="submit" disabled={loading} className="w-full mt-1">
              {loading ? "Salvando..." : "Salvar senha e entrar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
