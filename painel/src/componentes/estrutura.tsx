import {
  mdiAccountMultipleOutline, mdiAlertOctagonOutline, mdiBellRingOutline, mdiBullhornOutline, mdiCalendarMonthOutline,
  mdiChartBar, mdiClipboardTextOutline, mdiFormatListBulletedType, mdiImageMultipleOutline, mdiMapMarkerMultipleOutline,
  mdiMenu, mdiMessageTextOutline, mdiNewspaperVariantOutline, mdiOfficeBuildingOutline, mdiShapeOutline,
  mdiSignDirection, mdiViewDashboardOutline, mdiViewGridOutline,
} from '@mdi/js';
import { useQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';

import { useSessao } from '../lib/sessao';
import { supabase } from '../lib/supabase';
import { Icone } from './ui';

type Item = { para: string; texto: string; icone: string; admin?: boolean; contador?: number };

export function Estrutura() {
  const { perfil, ehAdmin, sair } = useSessao();
  const [aberta, setAberta] = useState(false);
  const local = useLocation();
  const [ultimoCaminho, setUltimoCaminho] = useState(local.pathname);
  if (ultimoCaminho !== local.pathname) {
    setUltimoCaminho(local.pathname);
    setAberta(false);
  }

  // Quantas solicitações aguardam resposta (aparece no menu).
  const abertas = useQuery({
    queryKey: ['contador-abertas'],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { count } = await supabase
        .from('solicitacoes')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'aberta');
      return count ?? 0;
    },
  });

  const grupos: { titulo?: string; itens: Item[] }[] = [
    {
      itens: [
        { para: '/', texto: 'Visão geral', icone: mdiViewDashboardOutline },
        { para: '/solicitacoes', texto: 'Solicitações', icone: mdiClipboardTextOutline, contador: abertas.data },
        { para: '/relatorios', texto: 'Relatórios', icone: mdiChartBar },
      ],
    },
    {
      titulo: 'Conteúdo do app',
      itens: [
        { para: '/avisos', texto: 'Avisos', icone: mdiBullhornOutline, admin: true },
        { para: '/noticias', texto: 'Notícias', icone: mdiNewspaperVariantOutline, admin: true },
        { para: '/banners', texto: 'Banners', icone: mdiImageMultipleOutline, admin: true },
        { para: '/eventos', texto: 'Agenda', icone: mdiCalendarMonthOutline, admin: true },
        { para: '/servicos', texto: 'Serviços', icone: mdiViewGridOutline, admin: true },
        { para: '/locais', texto: 'Locais e telefones', icone: mdiMapMarkerMultipleOutline, admin: true },
      ],
    },
    {
      titulo: 'Comunicação',
      itens: [
        { para: '/enviar-notificacao', texto: 'Enviar notificação', icone: mdiBellRingOutline, admin: true },
        { para: '/textos-notificacoes', texto: 'Textos automáticos', icone: mdiMessageTextOutline, admin: true },
      ],
    },
    {
      titulo: 'Configuração',
      itens: [
        { para: '/usuarios', texto: 'Usuários e equipe', icone: mdiAccountMultipleOutline, admin: true },
        { para: '/tipos', texto: 'Tipos de solicitação', icone: mdiFormatListBulletedType, admin: true },
        { para: '/secretarias', texto: 'Secretarias', icone: mdiOfficeBuildingOutline, admin: true },
        { para: '/bairros', texto: 'Bairros', icone: mdiSignDirection, admin: true },
        { para: '/categorias-evento', texto: 'Categorias da agenda', icone: mdiShapeOutline, admin: true },
        { para: '/erros', texto: 'Erros do app', icone: mdiAlertOctagonOutline, admin: true },
      ],
    },
  ];

  return (
    <div className="app">
      <aside className={`lateral ${aberta ? 'aberta' : ''}`} aria-label="Menu principal">
        <div className="marca">
          <img src="./logo.png" alt="" />
          <div>
            <strong>SAP Cidadão</strong>
            <span>Painel da Prefeitura</span>
          </div>
        </div>
        <nav className="menu">
          {grupos.map((g, i) => {
            const itens = g.itens.filter((it) => !it.admin || ehAdmin);
            if (!itens.length) return null;
            return (
              <Grupo key={i} titulo={g.titulo}>
                {itens.map((it) => (
                  <NavLink key={it.para} to={it.para} end={it.para === '/'} className={({ isActive }) => (isActive ? 'ativo' : '')}>
                    <Icone d={it.icone} tamanho={21} />
                    {it.texto}
                    {it.contador ? <span className="contador" aria-label={`${it.contador} novas`}>{it.contador}</span> : null}
                  </NavLink>
                ))}
              </Grupo>
            );
          })}
        </nav>
        <div className="usuario">
          <strong>{perfil?.nome}</strong>
          <span>
            {perfil?.tipo === 'admin' ? 'Administrador' : `Servidor · ${perfil?.secretaria?.nome ?? ''}`}
          </span>
          <div>
            <button onClick={() => sair()}>Sair</button>
          </div>
        </div>
      </aside>
      <div className="principal">
        <div className="topo-celular">
          <button onClick={() => setAberta(true)} aria-label="Abrir menu">
            <Icone d={mdiMenu} tamanho={28} cor="#fff" />
          </button>
          <strong>SAP Cidadão · Painel</strong>
        </div>
        <main className="conteudo">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Grupo({ titulo, children }: { titulo?: string; children: ReactNode }) {
  return (
    <>
      {titulo ? <div className="menu-grupo">{titulo}</div> : null}
      {children}
    </>
  );
}
