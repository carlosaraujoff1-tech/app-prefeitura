import { mdiLockOutline } from '@mdi/js';
import { HashRouter, Navigate, Route, Routes } from 'react-router';

import { Estrutura } from './componentes/estrutura';
import { Botao, Carregando, Vazio } from './componentes/ui';
import { useSessao } from './lib/sessao';
import { Bairros, Banners, CategoriasEvento, Eventos, Locais, Noticias, Avisos, Secretarias, Servicos, Tipos } from './paginas/cadastros';
import { Entrar } from './paginas/entrar';
import { Erros } from './paginas/erros';
import { Inicio } from './paginas/inicio';
import { EnviarNotificacao, TextosNotificacoes } from './paginas/notificacoes';
import { Relatorios } from './paginas/relatorios';
import { Solicitacao } from './paginas/solicitacao';
import { Solicitacoes } from './paginas/solicitacoes';
import { Usuarios } from './paginas/usuarios';

export function App() {
  const { carregando, sessao, perfil, ehAdmin, sair } = useSessao();
  if (carregando) return <Carregando />;
  if (!sessao) return <Entrar />;
  // A conta existe, mas não é da equipe (ou foi desativada): o banco já bloqueia, aqui só explicamos.
  if (!perfil || perfil.tipo === 'cidadao' || !perfil.ativo) {
    return (
      <div className="tela-login">
        <div className="cartao">
          <Vazio icone={mdiLockOutline} titulo="Sem acesso ao painel" texto="Sua conta é de cidadão ou está desativada. Peça a um administrador para liberar seu acesso.">
            <Botao onClick={() => sair()}>Sair</Botao>
          </Vazio>
        </div>
      </div>
    );
  }
  const soAdmin = (el: React.ReactNode) => (ehAdmin ? el : <Navigate to="/" replace />);
  return (
    <HashRouter>
      <Routes>
        <Route element={<Estrutura />}>
          <Route index element={<Inicio />} />
          <Route path="solicitacoes" element={<Solicitacoes />} />
          <Route path="solicitacoes/:id" element={<Solicitacao />} />
          <Route path="relatorios" element={<Relatorios />} />
          <Route path="avisos" element={soAdmin(<Avisos />)} />
          <Route path="noticias" element={soAdmin(<Noticias />)} />
          <Route path="banners" element={soAdmin(<Banners />)} />
          <Route path="eventos" element={soAdmin(<Eventos />)} />
          <Route path="servicos" element={soAdmin(<Servicos />)} />
          <Route path="locais" element={soAdmin(<Locais />)} />
          <Route path="enviar-notificacao" element={soAdmin(<EnviarNotificacao />)} />
          <Route path="textos-notificacoes" element={soAdmin(<TextosNotificacoes />)} />
          <Route path="usuarios" element={soAdmin(<Usuarios />)} />
          <Route path="tipos" element={soAdmin(<Tipos />)} />
          <Route path="secretarias" element={soAdmin(<Secretarias />)} />
          <Route path="bairros" element={soAdmin(<Bairros />)} />
          <Route path="categorias-evento" element={soAdmin(<CategoriasEvento />)} />
          <Route path="erros" element={soAdmin(<Erros />)} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
