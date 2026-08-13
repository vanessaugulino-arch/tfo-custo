import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { usePerfilNegocio } from "@/hooks/useData";
import { LoginScreen } from "@/screens/LoginScreen";
import { OnboardingWizard } from "@/screens/onboarding/OnboardingWizard";
import { InicioScreen } from "@/screens/InicioScreen";
import { InsumosScreen } from "@/screens/InsumosScreen";
import { ServicosScreen } from "@/screens/ServicosScreen";
import { NovoProdutoScreen } from "@/screens/NovoProdutoScreen";
import { ColecoesScreen } from "@/screens/ColecoesScreen";
import { EstoqueScreen } from "@/screens/EstoqueScreen";
import { ProducaoInternaScreen } from "@/screens/ProducaoInternaScreen";
import { RelatoriosScreen } from "@/screens/RelatoriosScreen";

function PoweredByFooter() {
  return (
    <div className="fixed bottom-2 right-3 z-40 pointer-events-none select-none text-[10px] tracking-wide text-muted-foreground/70">
      Powered by TFO · The Fashion Office
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  const { data: perfil, isLoading: carregandoPerfil } = usePerfilNegocio(user?.id);

  let conteudo: ReactNode;
  if (loading || (user && carregandoPerfil)) {
    conteudo = <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Carregando...</div>;
  } else if (!user) {
    conteudo = <LoginScreen />;
  } else if (!perfil?.onboarding_concluido) {
    conteudo = <OnboardingWizard />;
  } else {
    conteudo = (
      <Routes>
        <Route path="/configuracoes" element={<OnboardingWizard modo="configuracoes" />} />
        <Route element={<Layout />}>
          <Route index element={<InicioScreen />} />
          <Route path="/inicio" element={<InicioScreen />} />
          <Route path="/insumos" element={<InsumosScreen />} />
          <Route path="/servicos" element={<ServicosScreen />} />
          <Route path="/produtos/novo" element={<NovoProdutoScreen />} />
          <Route path="/colecoes" element={<ColecoesScreen />} />
          <Route path="/estoque" element={<EstoqueScreen />} />
          <Route path="/producao-interna" element={<ProducaoInternaScreen />} />
          <Route path="/relatorios" element={<RelatoriosScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    );
  }

  return (
    <>
      {conteudo}
      <PoweredByFooter />
    </>
  );
}
