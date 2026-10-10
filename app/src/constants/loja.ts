/**
 * Dados públicos de quem responde pela loja.
 *
 * Aparecem na Política de Privacidade, que a App Store exige e a LGPD manda
 * identificar o responsável pelos dados. Campo vazio simplesmente não é
 * exibido — a página nunca mostra um espaço em branco ou um "a preencher".
 *
 * PREENCHER antes de enviar o app para a loja: sem `responsavel`, `documento`
 * e `email` a política fica sem dizer quem é o controlador.
 */
export const Loja = {
  nome: 'Global Decora',
  /** Razão social da empresa, ou nome completo de quem responde por ela. */
  responsavel: '',
  /** CNPJ da empresa (ou CPF do responsável), já com a pontuação. */
  documento: '',
  /** E-mail que recebe pedidos sobre dados pessoais. */
  email: '',
  /** Dia da última mudança no texto da política, por extenso. */
  politicaAtualizadaEm: '9 de outubro de 2026',
} as const;
