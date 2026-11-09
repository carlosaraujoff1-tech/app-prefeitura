import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icone } from '@/components/icone';
import { BotaoLembrete } from '@/components/lembrete';
import { Cartao, ErroCarregar, Esqueleto, IconeCirculo, Vazio } from '@/components/ui';
import { Cores, Espaco, Fonte, Raio, Sombra } from '@/constants/theme';
import { listarEventosMes, type Evento } from '@/lib/api';
import { chaveDia, DIAS_CURTOS, DIAS_SEMANA, hojeBR, hora, MESES, partesBR } from '@/lib/formatar';

export default function Agenda() {
  const hoje = hojeBR();
  const [mes, setMes] = useState({ ano: hoje.ano, mes: hoje.mes });
  const [selecionado, setSelecionado] = useState<string>(chaveDia(hoje));
  const q = useQuery({
    queryKey: ['eventos-mes', mes.ano, mes.mes],
    queryFn: () => listarEventosMes(mes.ano, mes.mes),
  });

  const porDia = useMemo(() => {
    const m = new Map<string, Evento[]>();
    for (const e of q.data ?? []) {
      const k = chaveDia(partesBR(e.inicio_em));
      m.set(k, [...(m.get(k) ?? []), e]);
    }
    return m;
  }, [q.data]);

  const dias = useMemo(() => {
    const primeiro = new Date(Date.UTC(mes.ano, mes.mes, 1));
    const inicio = new Date(primeiro.getTime() - primeiro.getUTCDay() * 86400000);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(inicio.getTime() + i * 86400000);
      return { ano: d.getUTCFullYear(), mes: d.getUTCMonth(), dia: d.getUTCDate() };
    }).filter((d, i) => i < 35 || d.mes === mes.mes);
  }, [mes]);

  function mudarMes(delta: number) {
    const d = new Date(Date.UTC(mes.ano, mes.mes + delta, 1));
    const novo = { ano: d.getUTCFullYear(), mes: d.getUTCMonth() };
    setMes(novo);
    setSelecionado(novo.ano === hoje.ano && novo.mes === hoje.mes ? chaveDia(hoje) : chaveDia({ ...novo, dia: 1 }));
  }

  const eventosDoDia = porDia.get(selecionado) ?? [];
  const [sa, sm, sd] = selecionado.split('-').map(Number);
  const semanaSel = new Date(Date.UTC(sa, sm - 1, sd)).getUTCDay();
  const proximosDoMes = (q.data ?? []).filter((e) => partesBR(e.inicio_em).mes === mes.mes);

  return (
    <ScrollView
      contentContainerStyle={st.tela}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} colors={[Cores.primaria]} />}>
      <View style={st.calendario}>
        <View style={st.mesLinha}>
          <Pressable onPress={() => mudarMes(-1)} style={st.seta} accessibilityRole="button" accessibilityLabel="Mês anterior">
            <Icone nome="chevron-left" cor={Cores.primaria} tamanho={30} />
          </Pressable>
          <Text style={st.mesTitulo} accessibilityRole="header">
            {MESES[mes.mes][0].toUpperCase() + MESES[mes.mes].slice(1)} de {mes.ano}
          </Text>
          <Pressable onPress={() => mudarMes(1)} style={st.seta} accessibilityRole="button" accessibilityLabel="Próximo mês">
            <Icone nome="chevron-right" cor={Cores.primaria} tamanho={30} />
          </Pressable>
        </View>
        <View style={st.semana}>
          {DIAS_CURTOS.map((d) => (
            <Text key={d} style={st.semanaTexto}>
              {d}
            </Text>
          ))}
        </View>
        <View style={st.grade}>
          {dias.map((d) => {
            const k = chaveDia(d);
            const doMes = d.mes === mes.mes;
            const ehHoje = k === chaveDia(hoje);
            const sel = k === selecionado;
            const evs = porDia.get(k) ?? [];
            return (
              <Pressable
                key={k}
                onPress={() => {
                  if (!doMes) mudarMes(d.mes < mes.mes || d.ano < mes.ano ? -1 : 1);
                  setSelecionado(k);
                }}
                style={st.celula}
                accessibilityRole="button"
                accessibilityState={{ selected: sel }}
                accessibilityLabel={`${d.dia} de ${MESES[d.mes]}${evs.length ? `, ${evs.length} evento${evs.length > 1 ? 's' : ''}` : ''}`}>
                <View style={[st.dia, ehHoje && st.diaHoje, sel && st.diaSel]}>
                  <Text style={[st.diaTexto, !doMes && st.diaFora, sel && { color: Cores.branco }]}>{d.dia}</Text>
                </View>
                <View style={st.pontos}>
                  {evs.slice(0, 3).map((e) => (
                    <View key={e.id} style={[st.ponto, { backgroundColor: e.cor ?? Cores.primaria }]} />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Text style={st.diaTitulo} accessibilityRole="header">
        {DIAS_SEMANA[semanaSel][0].toUpperCase() + DIAS_SEMANA[semanaSel].slice(1)}, {sd} de {MESES[sm - 1]}
      </Text>

      {q.isError && !q.data ? (
        <ErroCarregar erro={q.error} tentarDeNovo={q.refetch} />
      ) : q.isPending ? (
        <Esqueleto altura={110} />
      ) : eventosDoDia.length ? (
        <View style={{ gap: Espaco.md }}>
          {eventosDoDia.map((e) => (
            <CartaoEvento key={e.id} evento={e} />
          ))}
        </View>
      ) : (
        <View style={{ gap: Espaco.md }}>
          <Text style={st.semEventos}>Nenhum evento neste dia.</Text>
          {proximosDoMes.length ? (
            <>
              <Text style={st.outros}>Outros eventos em {MESES[mes.mes]}:</Text>
              {proximosDoMes.slice(0, 5).map((e) => (
                <CartaoEvento key={e.id} evento={e} mostrarData />
              ))}
            </>
          ) : (
            <Vazio icone="calendar-blank-outline" titulo="Mês sem eventos" texto="Use as setas para ver outros meses." />
          )}
        </View>
      )}
    </ScrollView>
  );
}

function CartaoEvento({ evento: e, mostrarData }: { evento: Evento; mostrarData?: boolean }) {
  const p = partesBR(e.inicio_em);
  return (
    <Cartao
      onPress={() => router.push({ pathname: '/agenda/[id]', params: { id: e.id } })}
      rotulo={`${e.titulo}, ${hora(e.inicio_em)}${e.local_nome ? `, ${e.local_nome}` : ''}`}
      estilo={[st.evento, { borderLeftColor: e.cor ?? Cores.primaria }]}>
      <IconeCirculo nome={e.icone ?? 'calendar'} cor={e.cor ?? Cores.primaria} tamanho={50} />
      <View style={{ flex: 1, gap: 4 }}>
        {e.categoria ? <Text style={[st.categoria, { color: e.cor ?? Cores.primaria }]}>{e.categoria}</Text> : null}
        <Text style={st.eventoTitulo}>{e.titulo}</Text>
        <View style={st.meta}>
          <Icone nome="clock-outline" cor={Cores.textoSecundario} tamanho={18} />
          <Text style={st.metaTexto}>
            {mostrarData ? `${p.dia}/${String(p.mes + 1).padStart(2, '0')} · ` : ''}
            {hora(e.inicio_em)}
            {e.fim_em ? ` às ${hora(e.fim_em)}` : ''}
          </Text>
        </View>
        {e.local_nome ? (
          <View style={st.meta}>
            <Icone nome="map-marker-outline" cor={Cores.textoSecundario} tamanho={18} />
            <Text style={st.metaTexto}>{e.local_nome}</Text>
          </View>
        ) : null}
      </View>
      <BotaoLembrete evento={e} />
    </Cartao>
  );
}

const st = StyleSheet.create({
  tela: { padding: Espaco.lg, gap: Espaco.md, paddingBottom: 48, maxWidth: 760, width: '100%', alignSelf: 'center' },
  calendario: { backgroundColor: Cores.superficie, borderRadius: Raio.xl, padding: Espaco.md, ...Sombra },
  mesLinha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seta: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24 },
  mesTitulo: { fontSize: Fonte.grande - 1, fontWeight: '800', color: Cores.texto },
  semana: { flexDirection: 'row', marginTop: Espaco.sm },
  semanaTexto: { flex: 1, textAlign: 'center', fontSize: Fonte.pequena - 2, fontWeight: '800', color: Cores.textoSecundario },
  grade: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  celula: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3, minHeight: 52 },
  dia: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  diaHoje: { borderWidth: 2, borderColor: Cores.primaria },
  diaSel: { backgroundColor: Cores.primaria, borderColor: Cores.primaria },
  diaTexto: { fontSize: Fonte.normal + 1, fontWeight: '700', color: Cores.texto },
  diaFora: { color: '#A3AEBB' },
  pontos: { flexDirection: 'row', gap: 3, height: 7, marginTop: 2 },
  ponto: { width: 6, height: 6, borderRadius: 3 },
  diaTitulo: { fontSize: Fonte.grande - 1, fontWeight: '800', color: Cores.texto, marginTop: Espaco.sm },
  semEventos: { fontSize: Fonte.normal, color: Cores.textoSecundario },
  outros: { fontSize: Fonte.normal, fontWeight: '700', color: Cores.texto },
  evento: { flexDirection: 'row', gap: Espaco.md, alignItems: 'center', borderLeftWidth: 5 },
  categoria: { fontSize: Fonte.pequena - 1, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  eventoTitulo: { fontSize: Fonte.media - 1, fontWeight: '800', color: Cores.texto, lineHeight: 22 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTexto: { fontSize: Fonte.pequena + 1, color: Cores.textoSecundario, flexShrink: 1 },
});
