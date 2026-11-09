import type { NomeIcone } from '@/components/icone';

export const CATEGORIAS_LOCAL: Record<string, { nome: string; icone: NomeIcone; cor: string }> = {
  administracao: { nome: 'Prefeitura', icone: 'bank-outline', cor: '#0B4A8F' },
  saude: { nome: 'Saúde', icone: 'hospital-box-outline', cor: '#1B7A3D' },
  seguranca: { nome: 'Segurança', icone: 'shield-outline', cor: '#08376B' },
  emergencia: { nome: 'Emergência', icone: 'alarm-light-outline', cor: '#B42318' },
  educacao: { nome: 'Educação', icone: 'school-outline', cor: '#6A3FB5' },
  assistencia: { nome: 'Assistência Social', icone: 'hand-heart-outline', cor: '#A3361F' },
  cultura: { nome: 'Cultura', icone: 'drama-masks', cor: '#B4500C' },
  esporte: { nome: 'Esporte', icone: 'soccer', cor: '#2E6B30' },
  servicos: { nome: 'Serviços', icone: 'briefcase-outline', cor: '#4A5868' },
  justica: { nome: 'Justiça', icone: 'scale-balance', cor: '#5B4A1F' },
  transporte: { nome: 'Transporte', icone: 'bus', cor: '#1F5F7A' },
  outros: { nome: 'Outros', icone: 'map-marker-outline', cor: '#4A5868' },
};
