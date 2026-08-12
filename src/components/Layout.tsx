import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePerfilNegocio } from "@/hooks/useData";
import { OnboardingChecklist } from "./OnboardingChecklist";

const NAV_ITEMS = [
  { to: "/insumos", label: "Insumos" },
  { to: "/servicos", label: "Serviços" },
  { to: "/produtos/novo", label: "Novo produto" },
  { to: "/colecoes", label: "Coleções" },
  { to: "/estoque", label: "Estoque" },
];

export function Layout() {
  const { user, signOut } = useAuth();
  const { data: perfil } = usePerfilNegocio(user?.id);
  const mostrarProducaoInterna = perfil?.modelo_producao === "propria" || perfil?.modelo_producao === "misto";
  const navItems = mostrarProducaoInterna
    ? [...NAV_ITEMS, { to: "/producao-interna", label: "Produção interna" }]
    : NAV_ITEMS;

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 bg-sidebar text-sidebar-foreground p-4 flex flex-col">
        <div className="mb-6">
          <div className="text-lg font-serif">TFO Custos</div>
          <div className="text-xs text-sidebar-foreground/60">Custo de produto</div>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-sidebar-border pt-3 mt-3">
          <div className="text-xs text-sidebar-foreground/60 truncate mb-2">{user?.email}</div>
          <button
            onClick={signOut}
            className="text-sm text-sidebar-foreground/80 hover:text-sidebar-foreground transition-colors"
          >
            Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 max-w-6xl">
        <OnboardingChecklist />
        <Outlet />
      </main>
    </div>
  );
}
