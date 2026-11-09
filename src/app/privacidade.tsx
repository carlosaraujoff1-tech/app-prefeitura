import { ScrollView, StyleSheet, Text } from 'react-native';

import { Caixa, tx } from '@/components/ui';
import { Espaco } from '@/constants/theme';

// Texto-base da política (LGPD). A Prefeitura deve revisar e completar os dados do controlador e do encarregado.
const SECOES: { titulo: string; texto: string }[] = [
  {
    titulo: 'Quem cuida dos seus dados',
    texto:
      'A Prefeitura Municipal de Santo Antônio da Platina (PR) é a controladora dos dados tratados neste aplicativo, nos termos da Lei Geral de Proteção de Dados (Lei 13.709/2018).',
  },
  {
    titulo: 'Quais dados usamos',
    texto:
      'Nome, CPF, e-mail, celular e endereço (no cadastro); as solicitações que você envia, com fotos e o local do problema; os lembretes de eventos que você ativa; e o identificador do aparelho para enviar notificações. Sua localização só é usada no próprio celular para calcular distâncias, ou enviada quando você escolhe marcar o local de um problema.',
  },
  {
    titulo: 'Para que usamos',
    texto:
      'Para identificar você com segurança, atender e responder suas solicitações, enviar avisos sobre o andamento e lembretes que você pediu. Não vendemos nem usamos seus dados para propaganda.',
  },
  {
    titulo: 'Quem tem acesso',
    texto:
      'Apenas os servidores da secretaria responsável pela sua solicitação e os administradores do sistema. Os dados ficam em servidores no Brasil (São Paulo), com acesso protegido.',
  },
  {
    titulo: 'Por quanto tempo',
    texto:
      'Enquanto sua conta existir. Ao excluir a conta, apagamos seus dados pessoais. As solicitações permanecem como registro público da Prefeitura, sem seu nome e telefone.',
  },
  {
    titulo: 'Seus direitos',
    texto:
      'Você pode ver e corrigir seus dados em "Meus dados" e excluir sua conta a qualquer momento em Perfil → Excluir minha conta. Dúvidas sobre seus dados podem ser enviadas à Prefeitura.',
  },
];

export default function Privacidade() {
  return (
    <ScrollView contentContainerStyle={st.tela}>
      <Text style={tx.titulo}>Política de Privacidade</Text>
      <Caixa texto="Versão preliminar — em revisão pela Prefeitura." tipo="alerta" />
      {SECOES.map((s) => (
        <Text key={s.titulo} style={tx.corpo}>
          <Text style={{ fontWeight: '800' }}>{s.titulo}{'\n'}</Text>
          {s.texto}
        </Text>
      ))}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  tela: { padding: Espaco.xl, gap: Espaco.lg, paddingBottom: 48, maxWidth: 760, width: '100%', alignSelf: 'center' },
});
