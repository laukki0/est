// Cohort — listas de apoio pro formulário de perfil (país, estado e área
// de foco). Não é conteúdo gerado por IA, é só uma lista fixa de opções.

export const COUNTRIES = [
  { code: "BR", label: "Brasil" },
  { code: "PT", label: "Portugal" },
  { code: "AR", label: "Argentina" },
  { code: "MX", label: "México" },
  { code: "CO", label: "Colômbia" },
  { code: "CL", label: "Chile" },
  { code: "PE", label: "Peru" },
  { code: "US", label: "Estados Unidos" },
  { code: "OTHER", label: "Outro" },
];

// Estados/UFs do Brasil - só usado quando country === "BR" (senão o campo
// de estado vira um texto livre, já que não dá pra prever a divisão
// administrativa de qualquer país do mundo).
export const BRAZIL_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
  "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
  "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

export const FOCUS_AREAS = [
  "exatas",
  "humanas",
  "biologicas",
  "engenharia",
  "medicina",
  "direito",
  "licenciatura",
  "militar",
  "concursos",
  "outra",
];
