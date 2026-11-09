// Datas sempre no horário de Brasília (sem horário de verão desde 2019: UTC-3 fixo).
// Fazemos a conta à mão para funcionar igual em qualquer celular.
const OFFSET_MS = -3 * 60 * 60 * 1000;

export const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];
export const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const DIAS_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
export const DIAS_CURTOS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

export type DataBR = { ano: number; mes: number; dia: number; hora: number; minuto: number; semana: number };

export function partesBR(iso: string | Date): DataBR {
  const d = new Date(new Date(iso).getTime() + OFFSET_MS);
  return {
    ano: d.getUTCFullYear(),
    mes: d.getUTCMonth(),
    dia: d.getUTCDate(),
    hora: d.getUTCHours(),
    minuto: d.getUTCMinutes(),
    semana: d.getUTCDay(),
  };
}

const dois = (n: number) => String(n).padStart(2, '0');

export function chaveDia(p: { ano: number; mes: number; dia: number }) {
  return `${p.ano}-${dois(p.mes + 1)}-${dois(p.dia)}`;
}

export function hojeBR() {
  return partesBR(new Date());
}

export function dataCurta(iso: string) {
  const p = partesBR(iso);
  return `${dois(p.dia)}/${dois(p.mes + 1)}/${p.ano}`;
}

export function hora(iso: string) {
  const p = partesBR(iso);
  return `${dois(p.hora)}:${dois(p.minuto)}`;
}

export function dataExtenso(iso: string) {
  const p = partesBR(iso);
  return `${DIAS_SEMANA[p.semana]}, ${p.dia} de ${MESES[p.mes]} de ${p.ano}`;
}

export function dataHora(iso: string) {
  return `${dataCurta(iso)} às ${hora(iso)}`;
}

// "hoje", "ontem", "há 3 dias" ou a data.
export function quando(iso: string) {
  const hoje = hojeBR();
  const p = partesBR(iso);
  const diff = Math.round(
    (Date.UTC(hoje.ano, hoje.mes, hoje.dia) - Date.UTC(p.ano, p.mes, p.dia)) / 86400000,
  );
  if (diff === 0) return `hoje às ${hora(iso)}`;
  if (diff === 1) return `ontem às ${hora(iso)}`;
  if (diff > 1 && diff < 7) return `há ${diff} dias`;
  return dataCurta(iso);
}

// Máscaras ---------------------------------------------------------------
export const soDigitos = (v: string) => v.replace(/\D/g, '');

export function mascaraCpf(v: string) {
  const d = soDigitos(v).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

export function mascaraTelefone(v: string) {
  const d = soDigitos(v).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function mascaraCep(v: string) {
  const d = soDigitos(v).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function cpfValido(v: string) {
  const c = soDigitos(v);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const calc = (n: number) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(c[i]) * (n + 1 - i);
    const d = (s * 10) % 11;
    return d === 10 ? 0 : d;
  };
  return calc(9) === Number(c[9]) && calc(10) === Number(c[10]);
}

export function emailValido(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}

// Distância em linha reta (fórmula de Haversine).
export function distanciaKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function textoDistancia(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m de você`;
  return `${km.toFixed(1).replace('.', ',')} km de você`;
}

export function primeiroNome(nome?: string | null) {
  return (nome ?? '').trim().split(/\s+/)[0] ?? '';
}
