import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Painel de admin temporário (fase de testes) — cria login com senha
 * temporária, sem confirmação de e-mail. Restrito às sócias.
 */
const EMAILS_AUTORIZADOS = ["vanessa.ugulino@gmail.com", "emyli@thefashionoffice.com.br"];

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function gerarSenhaTemporaria(): string {
  const alfabeto = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  let senha = "";
  for (const b of bytes) senha += alfabeto[b % alfabeto.length];
  return senha;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const {
      data: { user: chamador },
      error: erroAuth,
    } = await anonClient.auth.getUser();

    if (erroAuth || !chamador?.email || !EMAILS_AUTORIZADOS.includes(chamador.email)) {
      return new Response(JSON.stringify({ error: "Acesso restrito." }), {
        status: 403,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const { email } = await req.json();
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Informe um e-mail válido." }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const senha = gerarSenhaTemporaria();
    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error: erroCriacao } = await adminClient.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { senha_temporaria: true },
    });

    if (erroCriacao) {
      const mensagem = erroCriacao.message.includes("already been registered")
        ? "Já existe uma conta com esse e-mail."
        : erroCriacao.message;
      return new Response(JSON.stringify({ error: mensagem }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ email, senha }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erro inesperado." }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
