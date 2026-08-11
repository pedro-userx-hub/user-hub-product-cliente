/**
 * Plano de tracking consolidado (spec §4).
 * Convenção: snake_case, padrão objeto_ação. Nenhum evento carrega e-mail,
 * nome ou dado pessoal — apenas ids internos e categorias.
 *
 * Nesta implementação de protótipo os eventos são registrados no console e
 * expostos em window.__wsEvents para inspeção. Trocar por client real (ex.:
 * Segment/Amplitude) na integração.
 */
export type AnalyticsEvent =
  | { name: "workspace_create_viewed"; operator_id: string }
  | {
      name: "workspace_created";
      workspace_id: string;
      operator_id: string;
      has_owner: boolean;
    }
  | {
      name: "workspace_create_failed";
      operator_id: string;
      reason: "cnpj_duplicado" | "validacao" | "rede" | "servidor";
    }
  | {
      name: "owner_provisioned";
      workspace_id: string;
      owner_user_id: string;
      access_flow: "temp_password" | "pending_invite";
    }
  | {
      name: "owner_access_generation_failed";
      workspace_id: string;
      access_flow: "temp_password" | "pending_invite";
      reason: string;
    }
  | {
      name: "workspace_detail_viewed";
      workspace_id: string;
      operator_id: string;
      status: "ativo" | "inativo";
    }
  | { name: "workspace_detail_load_failed"; workspace_id: string; reason: string }
  | { name: "member_add_viewed"; workspace_id: string; operator_id: string }
  | {
      name: "member_added";
      workspace_id: string;
      member_user_id: string;
      access_flow: "temp_password" | "pending_invite";
    }
  | {
      name: "member_add_failed";
      workspace_id: string;
      reason:
        | "duplicado"
        | "validacao"
        | "workspace_inativo"
        | "rede"
        | "servidor";
    }
  | {
      name: "member_list_viewed";
      workspace_id: string;
      member_count_bucket: "0" | "1-10" | "11-50" | "50+";
    }
  | {
      name: "owner_change_confirmed";
      workspace_id: string;
      previous_owner_id: string;
      new_owner_id: string;
      operator_id: string;
    }
  | { name: "owner_change_failed"; workspace_id: string; reason: string }
  | {
      name: "workspace_deactivate_confirmed";
      workspace_id: string;
      operator_id: string;
    }
  | { name: "workspace_deactivate_failed"; workspace_id: string; reason: string };

declare global {
  interface Window {
    __wsEvents?: Array<AnalyticsEvent & { ts: string }>;
  }
}

export function track(event: AnalyticsEvent): void {
  const enriched = { ...event, ts: new Date().toISOString() };
  if (typeof window !== "undefined") {
    window.__wsEvents = window.__wsEvents ?? [];
    window.__wsEvents.push(enriched);
  }
  // eslint-disable-next-line no-console
  console.debug("[track]", event.name, enriched);
}

export function memberCountBucket(
  count: number,
): "0" | "1-10" | "11-50" | "50+" {
  if (count === 0) return "0";
  if (count <= 10) return "1-10";
  if (count <= 50) return "11-50";
  return "50+";
}
