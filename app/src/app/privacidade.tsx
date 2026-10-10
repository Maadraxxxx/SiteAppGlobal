import { Link } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { Loja } from '@/constants/loja';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ROTAS } from '@/lib/rotas';

/**
 * Política de Privacidade.
 *
 * Página pública, sem login: é o endereço que vai no cadastro da App Store, e
 * o revisor (ou qualquer pessoa) precisa conseguir ler sem ter conta.
 *
 * O texto descreve o que o app faz de fato. Mudou o que é coletado, pra quem
 * vai ou por quanto tempo fica? Então este arquivo muda junto, e a data em
 * `Loja.politicaAtualizadaEm` também — uma política que diz menos do que o
 * app faz é pior do que não ter nenhuma.
 */

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <View style={styles.secao}>
      <ThemedText type="smallBold" style={styles.secaoTitulo}>
        {titulo}
      </ThemedText>
      {children}
    </View>
  );
}

function P({ children }: { children: ReactNode }) {
  return (
    <ThemedText type="small" themeColor="textSecondary" style={styles.paragrafo}>
      {children}
    </ThemedText>
  );
}

/** Item de lista: o termo em destaque, a explicação em seguida. */
function Item({ termo, children }: { termo?: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.item}>
      <View style={[styles.marcador, { backgroundColor: theme.primary }]} />
      <ThemedText type="small" themeColor="textSecondary" style={styles.itemTexto}>
        {termo ? <ThemedText type="smallBold">{termo} </ThemedText> : null}
        {children}
      </ThemedText>
    </View>
  );
}

export default function PrivacidadeScreen() {
  const theme = useTheme();
  const temResponsavel = !!(Loja.responsavel || Loja.documento);

  return (
    <Screen maxWidth={720} style={styles.tela}>
      <View style={styles.cabecalho}>
        <ThemedText type="subtitle">Política de Privacidade</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {Loja.nome} · Atualizada em {Loja.politicaAtualizadaEm}
        </ThemedText>
      </View>

      <View style={[styles.resumo, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="smallBold">Em poucas palavras</ThemedText>
        <P>
          Pedimos só o que é preciso para vender e entregar: quem você é, onde entregar e o que
          você comprou. Não vendemos seus dados, não mostramos anúncios e não acompanhamos o que
          você faz em outros apps ou sites. Você pode excluir sua conta quando quiser, pelo próprio
          app.
        </P>
      </View>

      <Secao titulo="1. Quem cuida dos seus dados">
        <P>
          Esta política vale para o aplicativo e o site da {Loja.nome}. Ela explica quais dados
          pessoais tratamos, por quê, com quem compartilhamos e quais são os seus direitos,
          conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
        </P>
        {temResponsavel ? (
          <P>
            Responsável pelo tratamento: {[Loja.responsavel, Loja.documento].filter(Boolean).join(' — ')}.
          </P>
        ) : null}
      </Secao>

      <Secao titulo="2. Quais dados coletamos">
        <Item termo="Cadastro.">
          Nome, e-mail e senha. A senha é guardada embaralhada, de um jeito que nem nós
          conseguimos ler.
        </Item>
        <Item termo="Entrar com Google ou com a Apple.">
          Se você escolher um desses, recebemos deles o seu nome, o seu e-mail e um código que
          identifica a sua conta — e, no caso do Google, o endereço da sua foto de perfil. Não
          recebemos a sua senha deles. Com a Apple você pode ocultar o e-mail; nesse caso
          recebemos o endereço substituto que ela cria.
        </Item>
        <Item termo="Entrega.">
          Endereço completo e CPF ou CNPJ de quem recebe. As transportadoras exigem o documento
          para emitir a etiqueta de envio.
        </Item>
        <Item termo="Pedidos.">
          O que você comprou, valores, forma de envio, código de rastreio e a situação do
          pagamento.
        </Item>
        <Item termo="Personalização com IA.">
          O tema que você escreve e as imagens criadas a partir dele.
        </Item>
        <Item termo="Suporte.">As mensagens que você troca com a loja pelo app.</Item>
        <Item termo="Dados técnicos.">
          Endereço IP, tipo de aparelho e horário dos acessos, registrados automaticamente pelo
          servidor para manter o serviço funcionando e investigar falhas.
        </Item>
        <P>
          O app não acessa a sua localização, os seus contatos, a câmera nem o microfone. O
          acesso às fotos do aparelho só é pedido à equipe da loja, para cadastrar produtos. Não
          coletamos dados de cartão: o pagamento é feito por Pix.
        </P>
      </Secao>

      <Secao titulo="3. Para que usamos">
        <Item>Criar e proteger a sua conta.</Item>
        <Item>Receber o pagamento, produzir e entregar o seu pedido.</Item>
        <Item>Criar a arte personalizada que você pediu.</Item>
        <Item>Responder às suas dúvidas e resolver problemas com pedidos.</Item>
        <Item>Cumprir obrigações legais, como guardar o registro das vendas.</Item>
        <P>
          Não usamos os seus dados para publicidade nem para criar perfis de consumo, e não os
          vendemos a ninguém.
        </P>
      </Secao>

      <Secao titulo="4. Com quem compartilhamos">
        <P>
          Só com as empresas que fazem parte do serviço funcionar, e apenas o necessário para
          cada uma:
        </P>
        <Item termo="Mercado Pago (pagamento).">
          Recebe seu nome, e-mail e o valor da compra para gerar a cobrança por Pix.
        </Item>
        <Item termo="Melhor Envio e transportadoras (entrega).">
          Recebem nome, endereço, e-mail e CPF ou CNPJ de quem vai receber a encomenda.
        </Item>
        <Item termo="OpenAI (criação das imagens).">
          Recebe o tema que você escreveu e a foto do produto escolhido. Não recebe seu nome,
          e-mail nem endereço.
        </Item>
        <Item termo="Supabase e Vercel (hospedagem).">
          Guardam o banco de dados, as imagens e os registros técnicos do servidor.
        </Item>
        <Item termo="Google e Apple (login).">
          Apenas se você escolher entrar por eles, para confirmar que a conta é sua.
        </Item>
        <Item termo="Resend (e-mail).">
          Recebe o seu endereço de e-mail para enviar a mensagem de recuperação de senha.
        </Item>
        <P>
          Algumas dessas empresas processam dados fora do Brasil. Também podemos compartilhar
          informações quando a lei ou uma ordem judicial exigir.
        </P>
      </Secao>

      <Secao titulo="5. Por quanto tempo guardamos">
        <Item termo="Conta, endereços e conversas de suporte:">
          enquanto a sua conta existir.
        </Item>
        <Item termo="Pedidos não pagos:">
          são cancelados automaticamente e apagados alguns dias depois.
        </Item>
        <Item termo="Pedidos pagos:">
          itens, valores e endereço de entrega ficam guardados pelo prazo exigido pela legislação
          fiscal e de defesa do consumidor, mesmo depois que a conta é excluída — sem ligação com
          o seu nome ou e-mail.
        </Item>
        <Item termo="Registros técnicos:">por um período curto, definido pelo serviço de hospedagem.</Item>
      </Secao>

      <Secao titulo="6. Como excluir a sua conta">
        <P>
          No app, entre em Perfil e toque em “Excluir minha conta”. A exclusão é imediata e não
          tem volta. Apagamos seu nome, e-mail, senha, endereços, CPF, conversas de suporte, artes
          que não viraram pedido e pedidos que não foram pagos.
        </P>
        <P>
          Se houver um pedido pago que ainda não foi enviado, a exclusão fica disponível assim que
          ele for despachado — até lá precisamos dos seus dados para fazer a entrega.
        </P>
        <Link href={ROTAS.excluirConta} style={styles.link}>
          <ThemedText type="smallBold" themeColor="primary">
            Ir para a exclusão de conta
          </ThemedText>
        </Link>
      </Secao>

      <Secao titulo="7. Seus direitos">
        <P>
          A qualquer momento você pode pedir para: saber quais dados temos sobre você, corrigir o
          que estiver errado, receber uma cópia, apagar o que não for obrigatório guardar e saber
          com quem compartilhamos. Nome e e-mail você mesmo corrige em Perfil › Editar Perfil;
          endereços, em Perfil › Meus Endereços.
        </P>
        <P>
          Se achar que seus dados não estão sendo tratados como deveriam, você também pode
          reclamar à Autoridade Nacional de Proteção de Dados (ANPD).
        </P>
      </Secao>

      <Secao titulo="8. Segurança">
        <P>
          A comunicação entre o app e o servidor é criptografada, as senhas são guardadas
          embaralhadas e o acesso aos dados é restrito a quem precisa deles para atender você.
          Nenhum sistema é infalível; se algo acontecer com os seus dados, avisaremos você e a
          ANPD conforme a lei determina.
        </P>
      </Secao>

      <Secao titulo="9. Menores de idade">
        <P>
          O serviço é voltado a maiores de 18 anos. Não coletamos intencionalmente dados de
          crianças ou adolescentes.
        </P>
      </Secao>

      <Secao titulo="10. Mudanças nesta política">
        <P>
          Se o que fazemos com os seus dados mudar, esta página muda junto e a data no topo é
          atualizada. Mudanças importantes serão avisadas no próprio app.
        </P>
      </Secao>

      <Secao titulo="11. Fale com a gente">
        <P>
          Para qualquer assunto sobre os seus dados, abra uma solicitação em Perfil › Suporte, no
          app.{Loja.email ? ` Se preferir, escreva para ${Loja.email}.` : ''}
        </P>
      </Secao>

      <View style={[styles.rodape, { borderColor: theme.border }]}>
        <ThemedText type="small" themeColor="textSecondary">
          {Loja.nome}
        </ThemedText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tela: {
    gap: Spacing.four,
  },
  cabecalho: {
    gap: Spacing.one,
  },
  resumo: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  secao: {
    gap: Spacing.two,
  },
  secaoTitulo: {
    fontSize: 15,
  },
  paragrafo: {
    lineHeight: 21,
  },
  item: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  marcador: {
    width: 5,
    height: 5,
    borderRadius: Radius.pill,
    // Alinha a bolinha com o meio da primeira linha do texto.
    marginTop: 8,
  },
  itemTexto: {
    flex: 1,
    lineHeight: 21,
  },
  link: {
    alignSelf: 'flex-start',
  },
  rodape: {
    alignItems: 'center',
    paddingTop: Spacing.three,
    borderTopWidth: 1,
  },
});
