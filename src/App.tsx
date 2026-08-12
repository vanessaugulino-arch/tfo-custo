import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { usePerfilNegocio } from "@/hooks/useData";
import { LoginScreen } from "@/screens/LoginScreen";
import { OnboardingWizard } from "@/screens/onboarding/OnboardingWizard";
import { InsumosScreen } from "@/screens/InsumosScreen";
import { ServicosScreen } from "@/screens/ServicosScreen";
import { NovoProdutoScreen } from "@/screens/NovoProdutoScreen";
import { ColecoesScreen } from "@/screens/ColecoesScreen";
import { EstoqueScreen } from "@/screens/EstoqueScreen";
import { ProducaoInternaScreen } from "@/screens/ProducaoInternaScreen";

export default function App() {
  const { user, loading } = useAuth();
  const { data: perfil, isLoading: carregandoPerfil } = usePerfilNegocio(user?.id);

  if (loading || (user && carregandoPerfil)) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Carregando...</div>;
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (!perfil?.onboarding_concluido) {
    return <OnboardingWizard />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/insumos" replace />} />
        <Route path="/insumos" element={<InsumosScreen />} />
        <Route path="/servicos" element={<ServicosScreen />} />
        <Route path="/produtos/novo" element={<NovoProdutoScreen />} />
        <Route path="/colecoes" element={<ColecoesScreen />} />
        <Route path="/estoque" element={<EstoqueScreen />} />
        <Route path="/producao-interna" element={<ProducaoInternaScreen />} />
        <Route path="*" element={<Navigate to="/insumos" replace />} />
      </Route>
    </Routes>
  );
}
