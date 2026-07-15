import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ToastProvider } from "@userx/ui";
import "@userx/ui/global.css";
import App from "./App";
import { CreateTeamProvider } from "./lib/CreateTeamContext";
import { InviteProvider } from "./lib/InviteContext";
import { TeamProvider } from "./lib/TeamContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <TeamProvider>
          <InviteProvider>
            <CreateTeamProvider>
              <App />
            </CreateTeamProvider>
          </InviteProvider>
        </TeamProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
