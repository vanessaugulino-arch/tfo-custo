import { Link } from "react-router-dom";
import { Card, PageTitle } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { usePerfilNegocio } from "@/hooks/useData";

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const PASSOS_BASE = [
  { to: "/insumos", titulo: "Insumos", texto: "Cadastre fornecedores e materiais — cada compra vira um preço por metro linear, já líquido de imposto." },
  {
    to: "/servicos",
    titulo: "Serviços",
    texto: "Modelagem, corte, costura... cada fornecedor com seu modelo de cobrança: por coleção, por peça desenvolvida, por peça produzida ou por tempo.",
  },
  {
    to: "/produtos/novo",
    titulo: "Novo produto",
    texto: "Junte insumos e serviços — o sistema soma tudo e congela o custo unitário no momento em que você salva.",
  },
  {
    to: "/colecoes",
    titulo: "Coleções",
    texto: "Aprove os produtos que vão para produção — isso desconta o estoque automaticamente. \"Feche\" a coleção para travar o custo definitivo de serviços por coleção/peça desenvolvida.",
  },
  {
    to: "/estoque",
    titulo: "Estoque",
    texto: "Acompanhe entradas, saídas e o saldo de cada material. Use o ajuste manual quando o inventário físico for diferente do sistema.",
  },
];

const PASSO_PRODUCAO_INTERNA = {
  to: "/producao-interna",
  titulo: "Produção interna",
  texto: "Cadastre os cargos e a capacidade da sua equipe para incluir o custo de mão de obra própria no preço dos produtos.",
};

export function InicioScreen() {
  const { user } = useAuth();
  const { data: perfil } = usePerfilNegocio(user?.id);
  const primeiroNome = user?.email ? capitalize(user.email.split("@")[0].split(/[.\-_0-9]/)[0]) : "";
  const mostrarProducaoInterna = perfil?.modelo_producao === "propria" || perfil?.modelo_producao === "misto";
  const passos = mostrarProducaoInterna ? [...PASSOS_BASE, PASSO_PRODUCAO_INTERNA] : PASSOS_BASE;

  return (
    <div>
      <PageTitle
        title={`Olá${primeiroNome ? `, ${primeiroNome}` : ""}${perfil?.nome_marca ? ` — ${perfil.nome_marca}` : ""}.`}
        subtitle="Este é o fluxo do Fashion Skills, do insumo comprado até o custo final da peça. Volte aqui sempre que quiser lembrar o que cada item do menu faz."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {passos.map((p, i) => (
          <Link key={p.to} to={p.to}>
            <Card className="h-full transition-colors hover:border-secondary">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold mb-3">
                {i + 1}
              </span>
              <h4 className="font-serif text-lg text-foreground mb-1">{p.titulo}</h4>
              <p className="text-sm text-muted-foreground">{p.texto}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
