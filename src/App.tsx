import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { LoginScreen } from "@/screens/LoginScreen";
import { InsumosScreen } from "@/screens/InsumosScreen";
import { ServicosScreen } from "@/screens/ServicosScreen";
import { NovoProdutoScreen } from "@/screens/NovoProdutoScreen";
import { ColecoesScreen } from "@/screens/ColecoesScreen";
import { EstoqueScreen } from "@/screens/EstoqueScreen";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Carregando...</div>;
  }

  if (!user) {
    return <LoginScreen />;
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
        <Route path="*" element={<Navigate to="/insumos" replace />} />
      </Route>
    </Routes>
  );
}
