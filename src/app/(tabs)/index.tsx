import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icone, type NomeIcone } from '@/components/icone';
import { Botao, Cartao, Esqueleto, IconeCirculo, Secao } from '@/components/ui';
import { Cores, Espaco, Fonte, Raio, Sombra } from '@/constants/theme';
import { abrirLink } from '@/lib/abrir';
import { buscarInicio, naoLidas, type Banner } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { MESES_CURTOS, partesBR, primeiroNome, quando, dataExtenso, hora } from '@/lib/formatar';

const ATALHOS: { titulo: string; icone: NomeIcone; rota: '/servicos' | '/locais' | '/telefones' | '/noticias' }[] = [
  { titulo: 'Serviços', icone: 'view-grid-outline', rota: '/servicos' },
  { titulo: 'Locais', icone: 'map-marker-radius-outline', rota: '/locais' },
  { titulo: 'Telefones', icone: 'phone-outline', rota: '/telefones' },
  { titulo: 'Notícias', icone: 'newspaper-variant-outline', rota: '/noticias' },
];

export default function Inicio() {
  const insets = useSafeAreaInsets();
  const { perfil, usuarioId } = useAuth();
  const inicio = useQuery({ queryKey: ['inicio'], queryFn: buscarInicio });
  const contador = useQuery({ queryKey: ['nao-lidas', usuarioId], queryFn: naoLidas, enabled: !!usuarioId });
  const dados = inicio.data;
  const nome = primeiroNome(perfil?.nome);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Cores.fundo }}
      contentContainerStyle={{ paddingBottom: Espaco.xxl }}
      refreshControl={
        <RefreshControl
          refreshing={inicio.isRefetching}
          onRefresh={() => {
            inicio.refetch();
            contador.refetch();
          }}
          tintColor={Cores.branco}
          colors={[Cores.primaria]}
        />
      }>
      {/* Topo azul */}
      <View style={[st.topo, { paddingTop: insets.top + Espaco.lg }]}>
        <View style={st.topoLinha}>
          <View style={{ flex: 1 }}>
            <Text style={st.topoPrefeitura}>Prefeitura de Santo Antônio da Platina</Text>
            <Text style={st.topoOla} accessibilityRole="header">
              {nome ? `Olá, ${nome}!` : 'Olá! Bem-vindo(a)'}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push(usuarioId ? '/notificacoes' : '/entrar')}
            style={st.sino}
            accessibilityRole="button"
            accessibilityLabel={
              contador.data ? `Notificações, ${contador.data} não lidas` : 'Notificações'
            }>
            <Icone nome="bell-outline" cor={Cores.branco} tamanho={26} />
            {contador.data ? (
              <View style={st.sinoBolinha}>
                <Text style={st.sinoNumero}>{contador.data > 9 ? '9+' : contador.data}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
        <Text style={st.topoApp}>SAP Cidadão</Text>
      </View>

      <View style={st.conteudo}>
        {/* Chamada principal */}
        <Cartao estilo={st.chamada}>
          <View style={st.chamadaLinha}>
            <IconeCirculo nome="bullhorn-outline" cor={Cores.primaria} tamanho={56} />
            <View style={{ flex: 1 }}>
              <Text style={st.chamadaTitulo}>Viu um problema na cidade?</Text>
              <Text style={st.chamadaTexto}>Buraco, iluminação, lixo… avise a Prefeitura e acompanhe.</Text>
            </View>
          </View>
          <Botao
            titulo="Abrir solicitação"
            icone="plus-circle-outline"
            onPress={() => router.push(usuarioId ? '/solicitacoes/nova' : '/entrar')}
          />
        </Cartao>

        {/* Banners */}
        {inicio.isPending && !dados ? (
          <Esqueleto altura={150} raio={Raio.xl} estilo={{ marginTop: Espaco.xl }} />
        ) : dados?.banners.length ? (
          <Banners itens={dados.banners} />
        ) : null}

        {/* Acesso rápido */}
        <Secao titulo="Acesso rápido" />
        <View style={st.atalhos}>
          {ATALHOS.map((a) => (
            <Pressable
              key={a.titulo}
              onPress={() => router.push(a.rota)}
              style={({ pressed }) => [st.atalho, pressed && { opacity: 0.8 }]}
              accessibilityRole="button"
              accessibilityLabel={a.titulo}>
              <IconeCirculo nome={a.icone} tamanho={50} />
              <Text style={st.atalhoTexto} numberOfLines={1}>
                {a.titulo}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Avisos */}
        <Secao titulo="Avisos da Prefeitura" acao="Ver todos" onAcao={() => router.push('/avisos')} />
        {inicio.isPending && !dados ? (
          <View style={{ gap: Espaco.md }}>
            <Esqueleto altura={92} />
            <Esqueleto altura={92} />
          </View>
        ) : (
          <View style={{ gap: Espaco.md }}>
            {(dados?.avisos ?? []).slice(0, 3).map((a) => {
              const p = partesBR(a.publicado_em);
              return (
                <Cartao
                  key={a.id}
                  onPress={() => router.push({ pathname: '/avisos/[id]', params: { id: a.id } })}
                  rotulo={`Aviso: ${a.titulo}`}
                  estilo={st.aviso}>
                  <View style={st.avisoData}>
                    <Text style={st.avisoDia}>{p.dia}</Text>
                    <Text style={st.avisoMes}>{MESES_CURTOS[p.mes]}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={st.avisoTitulo} numberOfLines={2}>
                      {a.fixado ? '📌 ' : ''}
                      {a.titulo}
                    </Text>
                    <Text style={st.avisoResumo} numberOfLines={2}>
                      {a.resumo}
                    </Text>
                  </View>
                </Cartao>
              );
            })}
            {dados && !dados.avisos.length ? (
              <Text style={st.nada}>Nenhum aviso no momento.</Text>
            ) : null}
          </View>
        )}

        {/* Agenda */}
        <Secao titulo="Próximos eventos" acao="Agenda" onAcao={() => router.push('/agenda')} />
        {dados?.eventos.length ? (
          <View style={{ gap: Espaco.md }}>
            {dados.eventos.slice(0, 3).map((e) => (
              <Cartao
                key={e.id}
                onPress={() => router.push({ pathname: '/agenda/[id]', params: { id: e.id } })}
                rotulo={`Evento: ${e.titulo}`}
                estilo={[st.evento, { borderLeftColor: e.cor ?? Cores.primaria }]}>
                <IconeCirculo nome={e.icone ?? 'calendar'} cor={e.cor ?? Cores.primaria} tamanho={46} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={st.avisoTitulo} numberOfLines={2}>
                    {e.titulo}
                  </Text>
                  <Text style={st.avisoResumo}>
                    {dataExtenso(e.inicio_em).split(',')[0]} · {hora(e.inicio_em)}
                    {e.local_nome ? ` · ${e.local_nome}` : ''}
                  </Text>
                </View>
              </Cartao>
            ))}
          </View>
        ) : (
          <Cartao onPress={() => router.push('/agenda')} estilo={st.aviso} rotulo="Ver agenda da cidade">
            <IconeCirculo nome="calendar-month-outline" tamanho={46} />
            <View style={{ flex: 1 }}>
              <Text style={st.avisoTitulo}>Agenda da cidade</Text>
              <Text style={st.avisoResumo}>Veja eventos, campanhas e atendimentos especiais.</Text>
            </View>
            <Icone nome="chevron-right" cor={Cores.textoSecundario} />
          </Cartao>
        )}

        {/* Notícias */}
        {dados?.noticias.length ? (
          <>
            <Secao titulo="Notícias" acao="Ver todas" onAcao={() => router.push('/noticias')} />
            <View style={{ gap: Espaco.md }}>
              {dados.noticias.map((n) => (
                <Cartao
                  key={n.id}
                  onPress={() => router.push({ pathname: '/noticias/[id]', params: { id: n.id } })}
                  rotulo={`Notícia: ${n.titulo}`}
                  estilo={st.aviso}>
                  <IconeCirculo nome="newspaper-variant-outline" tamanho={46} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={st.avisoTitulo} numberOfLines={2}>
                      {n.titulo}
                    </Text>
                    <Text style={st.avisoResumo}>{quando(n.publicado_em)}</Text>
                  </View>
                </Cartao>
              ))}
            </View>
          </>
        ) : null}

        <Text style={st.rodape}>SAP Cidadão · Prefeitura Municipal de Santo Antônio da Platina – PR</Text>
      </View>
    </ScrollView>
  );
}

function Banners({ itens }: { itens: Banner[] }) {
  const { width } = useWindowDimensions();
  const largura = Math.min(width, 720) - Espaco.lg * 2;
  const [atual, setAtual] = useState(0);
  return (
    <View style={{ marginTop: Espaco.xl }}>
      <FlatList
        data={itens}
        horizontal
        keyExtractor={(b) => b.id}
        showsHorizontalScrollIndicator={false}
        snapToInterval={largura + Espaco.md}
        decelerationRate="fast"
        contentContainerStyle={{ gap: Espaco.md }}
        onMomentumScrollEnd={(ev) => setAtual(Math.round(ev.nativeEvent.contentOffset.x / (largura + Espaco.md)))}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => abrirLink(item.link)}
            disabled={!item.link}
            accessibilityRole={item.link ? 'button' : 'text'}
            accessibilityLabel={`${item.titulo}. ${item.descricao ?? ''}`}
            style={[st.banner, { width: largura, backgroundColor: item.cor ?? Cores.primaria }]}>
            <View style={st.bannerIconeFundo}>
              <Icone nome={item.icone ?? 'city-variant-outline'} cor="rgba(255,255,255,0.18)" tamanho={150} />
            </View>
            <View style={st.bannerSelo}>
              <Icone nome={item.icone ?? 'information-outline'} cor={Cores.branco} tamanho={22} />
            </View>
            <Text style={st.bannerTitulo} numberOfLines={2}>
              {item.titulo}
            </Text>
            {item.descricao ? (
              <Text style={st.bannerTexto} numberOfLines={2}>
                {item.descricao}
              </Text>
            ) : null}
            {item.link ? (
              <View style={st.bannerMais}>
                <Text style={st.bannerMaisTexto}>Saiba mais</Text>
                <Icone nome="arrow-right" cor={Cores.branco} tamanho={18} />
              </View>
            ) : null}
          </Pressable>
        )}
      />
      {itens.length > 1 ? (
        <View style={st.pontos} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {itens.map((b, i) => (
            <View key={b.id} style={[st.ponto, i === atual && st.pontoAtivo]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  topo: {
    backgroundColor: Cores.primaria,
    paddingHorizontal: Espaco.lg,
    paddingBottom: 56,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  topoLinha: { flexDirection: 'row', alignItems: 'flex-start', gap: Espaco.md },
  topoPrefeitura: { color: '#D6E4F5', fontSize: Fonte.pequena, fontWeight: '600' },
  topoOla: { color: Cores.branco, fontSize: Fonte.titulo + 2, fontWeight: '800', marginTop: 4, letterSpacing: -0.4 },
  topoApp: { color: '#D6E4F5', fontSize: Fonte.normal, marginTop: 2 },
  sino: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sinoBolinha: {
    position: 'absolute',
    top: 4,
    right: 3,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 4,
    backgroundColor: Cores.destaque,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Cores.primaria,
  },
  sinoNumero: { color: Cores.texto, fontSize: 11, fontWeight: '900' },
  conteudo: { paddingHorizontal: Espaco.lg, maxWidth: 760, width: '100%', alignSelf: 'center' },
  chamada: { marginTop: -40, gap: Espaco.lg, padding: Espaco.lg },
  chamadaLinha: { flexDirection: 'row', gap: Espaco.md, alignItems: 'center' },
  chamadaTitulo: { fontSize: Fonte.media + 1, fontWeight: '800', color: Cores.texto },
  chamadaTexto: { fontSize: Fonte.normal - 1, color: Cores.textoSecundario, marginTop: 2, lineHeight: 21 },
  banner: { minHeight: 156, borderRadius: Raio.xl, padding: Espaco.lg, overflow: 'hidden', justifyContent: 'flex-end' },
  bannerIconeFundo: { position: 'absolute', right: -24, top: -10 },
  bannerSelo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Espaco.sm,
  },
  bannerTitulo: { color: Cores.branco, fontSize: Fonte.grande, fontWeight: '800', letterSpacing: -0.2 },
  bannerTexto: { color: '#F1F5FB', fontSize: Fonte.normal - 1, marginTop: 4, lineHeight: 21, maxWidth: '92%' },
  bannerMais: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Espaco.sm },
  bannerMaisTexto: { color: Cores.branco, fontWeight: '800', fontSize: Fonte.pequena + 1, textDecorationLine: 'underline' },
  pontos: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: Espaco.md },
  ponto: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#B8C4D3' },
  pontoAtivo: { width: 22, backgroundColor: Cores.primaria },
  atalhos: { flexDirection: 'row', gap: Espaco.sm },
  atalho: {
    flex: 1,
    backgroundColor: Cores.superficie,
    borderRadius: Raio.lg,
    paddingVertical: Espaco.md,
    alignItems: 'center',
    gap: Espaco.sm,
    ...Sombra,
  },
  atalhoTexto: { fontSize: Fonte.pequena, fontWeight: '700', color: Cores.texto },
  aviso: { flexDirection: 'row', gap: Espaco.md, alignItems: 'center' },
  avisoData: {
    width: 56,
    height: 60,
    borderRadius: Raio.md,
    backgroundColor: Cores.primariaClara,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avisoDia: { fontSize: Fonte.grande, fontWeight: '900', color: Cores.primaria, lineHeight: 24 },
  avisoMes: { fontSize: Fonte.pequena - 1, fontWeight: '800', color: Cores.primaria, textTransform: 'uppercase' },
  avisoTitulo: { fontSize: Fonte.media - 1, fontWeight: '800', color: Cores.texto, lineHeight: 22 },
  avisoResumo: { fontSize: Fonte.pequena + 1, color: Cores.textoSecundario, lineHeight: 20 },
  evento: { flexDirection: 'row', gap: Espaco.md, alignItems: 'center', borderLeftWidth: 5 },
  nada: { color: Cores.textoSecundario, fontSize: Fonte.normal },
  rodape: { textAlign: 'center', color: Cores.textoSecundario, fontSize: Fonte.pequena - 1, marginTop: Espaco.xxl },
});
