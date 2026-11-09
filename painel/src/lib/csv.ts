// Baixa uma planilha CSV (abre no Excel com acentos corretos).
export function baixarCsv(nome: string, linhas: (string | number | null | undefined)[][]) {
  const texto = linhas
    .map((l) => l.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';'))
    .join('\r\n');
  const blob = new Blob(['﻿' + texto], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
