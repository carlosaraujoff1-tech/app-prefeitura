// Cores e medidas do SAP Cidadão.
// Contraste conferido para leitura fácil (texto principal >= 7:1, secundário >= 4.5:1 sobre o fundo).
export const Cores = {
  primaria: '#0B4A8F', // azul da prefeitura
  primariaEscura: '#08376B',
  primariaClara: '#E7F0FA',
  destaque: '#F2B705', // amarelo do brasão (só para detalhes, nunca texto sobre branco)
  fundo: '#F2F5F9',
  superficie: '#FFFFFF',
  texto: '#14202E',
  textoSecundario: '#4A5868', // nunca usar cinza mais claro que isto para texto
  borda: '#D5DDE7',
  sucesso: '#1B7A3D',
  sucessoClaro: '#E5F4EA',
  alerta: '#8A5A00',
  alertaClaro: '#FFF4D6',
  erro: '#B42318',
  erroClaro: '#FDECEA',
  branco: '#FFFFFF',
} as const;

export const Espaco = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const Raio = { sm: 8, md: 12, lg: 16, xl: 22, pilula: 999 } as const;

// Tamanhos de letra base. O app respeita o "tamanho da fonte" do celular.
export const Fonte = { pequena: 14, normal: 16, media: 18, grande: 21, titulo: 26 } as const;

// Área mínima de toque recomendada (48 x 48) — importante para idosos.
export const ToqueMinimo = 48;

export const Sombra = {
  shadowColor: '#0B2545',
  shadowOpacity: 0.08,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
} as const;
