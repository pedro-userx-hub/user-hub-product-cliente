import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ToastProvider } from "@userx/ui";
import "@userx/ui/global.css";
import "./features/workspaces/ds-bridge.css";
import App from "./App";
import { AuthProvider } from "./lib/AuthContext";
import { CreateTeamProvider } from "./lib/CreateTeamContext";
import { InviteProvider } from "./lib/InviteContext";
import { LensProvider } from "./lib/LensContext";
import { TeamProvider } from "./lib/TeamContext";
import { WorkspaceProvider } from "./features/workspaces/lib/store";
import { ProductVersionProvider } from "./versions/ProductVersionContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <ProductVersionProvider>
          <AuthProvider>
            <TeamProvider>
              <LensProvider>
                <WorkspaceProvider>
                  <InviteProvider>
                    <CreateTeamProvider>
                      <App />
                    </CreateTeamProvider>
                  </InviteProvider>
                </WorkspaceProvider>
              </LensProvider>
            </TeamProvider>
          </AuthProvider>
        </ProductVersionProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
