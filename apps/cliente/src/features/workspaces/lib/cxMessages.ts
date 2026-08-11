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
    "Não há outro membro para tornar owner. Adicione um membro primeiro.",
  ownerChangeConfirm: (member: string, currentOwner: string) =>
    `Tornar ${member} owner? ${currentOwner} deixará de ser owner.`,
  ownerChanged: "Owner atualizado.",

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
