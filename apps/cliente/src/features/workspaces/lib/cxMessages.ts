/**
 * Catálogo de mensagens (PT-BR) — copy canônica do spec.
 * Centralizado para revisão de conteúdo e consistência entre telas.
 */
export const messages = {
  workspaceNameRequired: "Informe o nome do workspace.",
  workspaceTypeRequired: "Selecione o tipo do workspace.",
  cnpjRequired: "Informe o CNPJ.",
  cnpjInvalid: "CNPJ inválido. Verifique os números informados.",
  cnpjDuplicate: "Já existe um workspace com este CNPJ.",
  workspaceCreateServerError:
    "Não foi possível criar o workspace. Tente novamente.",

  ownerFirstNameRequired: "Informe o nome do owner.",
  ownerLastNameRequired: "Informe o sobrenome do owner.",
  ownerEmailInvalid: "Informe um e-mail válido para o owner.",
  ownerPhoneRequired: "Informe o telefone do owner.",
  ownerTempPasswordGenerated:
    "Senha temporária gerada. Copie e envie ao owner com segurança.",
  ownerAccessPending:
    "Workspace criado, mas o acesso do owner ficou pendente. Gere a senha ou o convite novamente.",

  memberEmailDuplicate: "Este e-mail já é membro deste workspace.",
  memberAdded: "Membro adicionado.",
  memberNameRequired: "Informe o nome do membro.",
  memberEmailInvalid: "Informe um e-mail válido.",
  memberWorkspaceInactive:
    "Não é possível adicionar membros a um workspace inativo.",
  memberAccessInfo:
    "Os dados de acesso foram gerados automaticamente e deverão ser enviados manualmente pelo time operacional.",

  membersEmpty: "Ainda não há outros membros. Adicione o primeiro.",
  teamsEmpty: "Nenhum time criado neste workspace.",

  ownerChangeNoEligible:
    "Não há outro membro para tornar dono. Adicione um membro primeiro.",
  ownerChangeTitle: (name: string) => `Tornar ${name} dono do workspace.`,
  ownerChangeContext: (name: string) =>
    `${name} passa a ser dono deste workspace.`,
  ownerChangeQuestion: (name: string) => `O que fazer com ${name}?`,
  ownerChangeKeep: "Manter no workspace com nova permissão",
  ownerChangeKeepRole: (name: string) => `Nova permissão de ${name}`,
  ownerChangeInactivate: (name: string) => `Inativar ${name}`,
  ownerChangeInactivateHint:
    "A pessoa continua listada no workspace, mas perde o acesso. Você pode reativá-la depois pela lista de membros.",
  ownerChangeSummaryKeep: (newOwner: string, former: string, role: string) =>
    `${newOwner} vira dono. ${former} passa a ${role}.`,
  ownerChangeSummaryInactivate: (newOwner: string, former: string) =>
    `${newOwner} vira dono. ${former} é inativado.`,
  ownerChangeConfirmKeep: "Trocar dono",
  ownerChangeConfirmInactivate: (name: string) =>
    `Trocar dono e inativar ${name}`,
  ownerChangeCancel: "Cancelar",
  ownerChangeSuccessKeep: (newOwner: string, former: string, role: string) =>
    `${newOwner} agora é dono. ${former} passou a ${role}.`,
  ownerChangeSuccessInactivate: (newOwner: string, former: string) =>
    `${newOwner} agora é dono. ${former} foi inativado.`,
  ownerChangeError:
    "Não foi possível trocar o dono. Nenhuma alteração foi aplicada. Tente de novo.",
  ownerChangeSelectHint:
    "Selecione quem será o novo dono. Em seguida você define o que acontece com o dono atual.",
  ownerChangeContinue: "Continuar",
  memberReactivated: (name: string) => `${name} foi reativado.`,
  memberReactivateError: "Não foi possível reativar o membro. Tente de novo.",

  deactivateConfirm:
    "Desativar este workspace? Os usuários perderão acesso. Nenhum dado será excluído.",
  workspaceDeactivated: "Workspace desativado.",

  detailLoadFailed: "Não foi possível carregar o workspace. Tentar novamente.",
  memberSearchEmpty: (term: string) =>
    `Nenhum membro encontrado para "${term}".`,

  workspaceCreated: "Workspace criado.",
  listLoadFailed: "Não foi possível carregar os workspaces.",

  ownerAccessNotice:
    "Os dados de acesso do Owner serão gerados automaticamente após a criação do workspace. Nesta primeira versão, essas informações deverão ser enviadas manualmente pelo time operacional. Futuramente esse envio será realizado automaticamente pela plataforma.",
} as const;
