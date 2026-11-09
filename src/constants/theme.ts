// Cores e medidas do SAP Cidadão.
// Contraste conferido para leitura fácil (texto principal >= 7:1, secundário >= 4.5:1 sobre o fundo).
export const Cores = {
  primaria: '#0B4A8F', // azul da prefeitura (barra superior e botões)
  primariaEscura: '#08376B',
  primariaClara: '#E7F0FA',
  fundo: '#F2F5F9',
  superficie: '#FFFFFF',
  texto: '#14202E',
  textoSecundario: '#4A5868', // nunca usar cinza mais claro que isto para texto
  borda: '#CBD5E1',
  sucesso: '#1B7A3D',
  alerta: '#9A6400',
  erro: '#B42318',
  branco: '#FFFFFF',
} as const;

export const Espaco = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const Raio = { sm: 8, md: 12, lg: 16, pilula: 999 } as const;

// Tamanhos de letra base. O app respeita o "tamanho da fonte" do celular (não travamos allowFontScaling).
export const Fonte = { pequena: 14, normal: 16, media: 18, grande: 22, titulo: 26 } as const;

// Área mínima de toque recomendada (48 x 48) — importante para idosos.
export const ToqueMinimo = 48;
