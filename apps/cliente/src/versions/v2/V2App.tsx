import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "../../components/layout/AppLayout";
import { RequireAuth } from "../../pages/RequireAuth";
import { LoginPage } from "../../pages/LoginPage";
import { CriteriaStudioPage } from "./CriteriaStudioPage";
import { ConstructorPage } from "./ConstructorPage";
import { PromptEntryPage } from "./PromptEntryPage";
import { V2DraftProvider } from "./V2DraftContext";
import { StudyWorkspacePage } from "./workspace/StudyWorkspacePage";

/**
 * App da versão 2.0 — Specs 01–04.
 */
export function V2App() {
  return (
    <V2DraftProvider>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/v2" replace />} />
            <Route path="v2" element={<PromptEntryPage />} />
          </Route>
          <Route path="v2/estudio" element={<ConstructorPage />} />
          <Route path="v2/criterios" element={<CriteriaStudioPage />} />
          <Route path="v2/estudos/:studyId" element={<StudyWorkspacePage />} />
          {/* Clique na lista V1/estudos sob V2 */}
          <Route path="estudos/:studyId" element={<StudyWorkspacePage />} />
          <Route path="*" element={<Navigate to="/v2" replace />} />
        </Route>
      </Routes>
    </V2DraftProvider>
  );
}
