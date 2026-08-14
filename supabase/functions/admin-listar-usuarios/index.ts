import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/** Painel de admin temporário — lista usuários para acompanhar quem já acessou. Restrito às sócias. */
const EMAILS_AUTORIZADOS = ["vanessa.ugulino@gmail.com", "emyli@thefashionoffice.com.br"];

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error: erroLista } = await adminClient.auth.admin.listUsers({ perPage: 200 });
    if (erroLista) {
      return new Response(JSON.stringify({ error: erroLista.message }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const usuarios = data.users
      .map((u) => ({
        id: u.id,
        email: u.email ?? "",
        criadoEm: u.created_at,
        ultimoAcesso: u.last_sign_in_at ?? null,
        senhaTemporaria: !!u.user_metadata?.senha_temporaria,
      }))
      .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());

    return new Response(JSON.stringify({ usuarios }), {
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
