import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { AcceptInvitePage } from "./pages/AcceptInvitePage";
import { EstudosPage } from "./pages/EstudosPage";
import { FinanceiroPage } from "./pages/FinanceiroPage";
import { GestaoGuard } from "./pages/GestaoGuard";
import { GestaoMembrosPage } from "./pages/GestaoMembrosPage";
import { GestaoTimesPage } from "./pages/GestaoTimesPage";
import { GestaoBalancoPage } from "./pages/GestaoBalancoPage";
import { LoginPage } from "./pages/LoginPage";
import { TimePage } from "./pages/TimePage";

export default function App() {
  return (
    <Routes>
      <Route path="convite/:token" element={<AcceptInvitePage />} />
      <Route path="login" element={<LoginPage />} />

      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/estudos" replace />} />
        <Route path="estudos" element={<EstudosPage />} />
        <Route path="financeiro" element={<FinanceiroPage />} />
        <Route path="time" element={<TimePage />} />
        <Route
          path="gestao/times"
          element={
            <GestaoGuard section="times">
              <GestaoTimesPage />
            </GestaoGuard>
          }
        />
        <Route
          path="gestao/membros"
          element={
            <GestaoGuard section="membros">
              <GestaoMembrosPage />
            </GestaoGuard>
          }
        />
        <Route
          path="gestao/balanco"
          element={
            <GestaoGuard section="balanco">
              <GestaoBalancoPage />
            </GestaoGuard>
          }
        />
        <Route
          path="gestao"
          element={<Navigate to="/gestao/times" replace />}
        />
      </Route>
      <Route path="*" element={<Navigate to="/estudos" replace />} />
    </Routes>
  );
}
