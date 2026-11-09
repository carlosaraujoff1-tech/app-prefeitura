import { mdiCheckDecagramOutline } from '@mdi/js';
import { useQuery } from '@tanstack/react-query';

import { mensagemErro } from '@/lib/erros';
import { dataHora } from '@/lib/formatar';

import { Cabecalho, Caixa, Carregando, Vazio } from '../componentes/ui';
import { supabase } from '../lib/supabase';

export function Erros() {
  const q = useQuery({
    queryKey: ['erros-app'],
    queryFn: async () => {
      const { data, error } = await supabase.from('erros_app').select('id,mensagem,tela,plataforma,versao_app,criado_em').order('criado_em', { ascending: false }).limit(200);
      if (error) throw error;
      return data as { id: number; mensagem: string; tela: string | null; plataforma: string | null; versao_app: string | null; criado_em: string }[];
    },
  });
  return (
    <>
      <Cabecalho titulo="Erros do app" texto="Falhas registradas nos celulares dos cidadãos. Ajudam a corrigir problemas rápido." />
      <div className="cartao sem-padding">
        {q.isPending ? (
          <Carregando />
        ) : q.isError ? (
          <Caixa tipo="erro">{mensagemErro(q.error)}</Caixa>
        ) : !q.data.length ? (
          <Vazio icone={mdiCheckDecagramOutline} titulo="Nenhum erro registrado" />
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>Quando</th>
                <th>Erro</th>
                <th>Tela</th>
                <th>Aparelho</th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((e) => (
                <tr key={e.id}>
                  <td className="pequeno" style={{ width: 160 }}>{dataHora(e.criado_em)}</td>
                  <td className="pequeno" style={{ wordBreak: 'break-word' }}>{e.mensagem}</td>
                  <td className="pequeno">{e.tela ?? '—'}</td>
                  <td className="pequeno">{[e.plataforma, e.versao_app].filter(Boolean).join(' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
