// Busca o endereço pelo CEP (ViaCEP, serviço público e gratuito).
export async function buscarCep(cep: string) {
  const d = cep.replace(/\D/g, '');
  if (d.length !== 8) return null;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
    const j = await r.json();
    if (j.erro) return null;
    return {
      logradouro: (j.logradouro as string) ?? '',
      bairro: (j.bairro as string) ?? '',
      cidade: (j.localidade as string) ?? '',
      uf: (j.uf as string) ?? '',
    };
  } catch {
    return null;
  }
}
