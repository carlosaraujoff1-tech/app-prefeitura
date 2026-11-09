import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
import type { ComponentProps } from 'react';

export type NomeIcone = ComponentProps<typeof MaterialDesignIcons>['name'];

// Ícones vêm do banco como texto (nomes de https://pictogrammers.com/library/mdi/).
// O painel só deixa escolher nomes de uma lista conferida.
export function Icone({
  nome,
  tamanho = 24,
  cor,
  padrao = 'circle-outline',
}: {
  nome: string | null | undefined;
  tamanho?: number;
  cor: string;
  padrao?: NomeIcone;
}) {
  return (
    <MaterialDesignIcons
      name={(nome || padrao) as NomeIcone}
      size={tamanho}
      color={cor}
      accessible={false}
      importantForAccessibility="no"
    />
  );
}
