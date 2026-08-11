import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { WorkspaceCreatePage } from "./features/workspaces/WorkspaceCreatePage";
import { WorkspaceDetailPage } from "./features/workspaces/WorkspaceDetailPage";
import { WorkspaceListPage } from "./features/workspaces/WorkspaceListPage";
import { AcceptInvitePage } from "./pages/AcceptInvitePage";
import { CreateStudyPage } from "./pages/CreateStudyPage";
import { EstudosPage } from "./pages/EstudosPage";
import { FinanceiroPage } from "./pages/FinanceiroPage";
import { GestaoGuard } from "./pages/GestaoGuard";
import { GestaoMembrosPage } from "./pages/GestaoMembrosPage";
import { GestaoTimesPage } from "./pages/GestaoTimesPage";
import { GestaoBalancoPage } from "./pages/GestaoBalancoPage";
import { LoginPage } from "./pages/LoginPage";
import { StudyDetailPage } from "./pages/StudyDetailPage";
import { TimePage } from "./pages/TimePage";

export default function App() {
  return (
    <Routes>
      <Route path="convite/:token" element={<AcceptInvitePage />} />
      <Route path="login" element={<LoginPage />} />

      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/estudos" replace />} />
        <Route path="estudos" element={<EstudosPage />} />
        <Route path="estudos/:studyId/criar" element={<CreateStudyPage />} />
        <Route path="estudos/:studyId" element={<StudyDetailPage />} />
        <Route path="financeiro" element={<FinanceiroPage />} />
        <Route path="time" element={<TimePage />} />
        <Route path="workspaces" element={<WorkspaceListPage />} />
        <Route path="workspaces/novo" element={<WorkspaceCreatePage />} />
        <Route path="workspaces/:id" element={<WorkspaceDetailPage />} />
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
