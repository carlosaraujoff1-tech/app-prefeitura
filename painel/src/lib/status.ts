import { mdiAccountHardHat, mdiCancel, mdiCheckCircle, mdiCloseCircle, mdiInboxArrowDown, mdiMagnify } from '@mdi/js';

export type Status = 'aberta' | 'em_analise' | 'em_execucao' | 'concluida' | 'indeferida' | 'cancelada';

export const STATUS: Record<Status, { rotulo: string; cor: string; fundo: string; icone: string }> = {
  aberta: { rotulo: 'Recebida', cor: '#0B4A8F', fundo: '#E7F0FA', icone: mdiInboxArrowDown },
  em_analise: { rotulo: 'Em análise', cor: '#8A5A00', fundo: '#FFF4D6', icone: mdiMagnify },
  em_execucao: { rotulo: 'Em execução', cor: '#6A3FB5', fundo: '#F0EAFB', icone: mdiAccountHardHat },
  concluida: { rotulo: 'Concluída', cor: '#1B7A3D', fundo: '#E5F4EA', icone: mdiCheckCircle },
  indeferida: { rotulo: 'Não atendida', cor: '#B42318', fundo: '#FDECEA', icone: mdiCloseCircle },
  cancelada: { rotulo: 'Cancelada', cor: '#4A5868', fundo: '#EEF1F5', icone: mdiCancel },
};

export const STATUS_ABERTOS: Status[] = ['aberta', 'em_analise', 'em_execucao'];
