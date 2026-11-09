// Transforma erros técnicos em frases que o cidadão entende.
export function mensagemErro(erro: unknown): string {
  const msg =
    typeof erro === 'string'
      ? erro
      : erro && typeof erro === 'object' && 'message' in erro
        ? String((erro as { message: unknown }).message)
        : '';
  if (!msg) return 'Algo deu errado. Tente novamente.';
  if (/network|fetch|Failed to fetch|timeout/i.test(msg)) {
    return 'Sem conexão com a internet. Verifique e tente de novo.';
  }
  if (/Database error saving new user/i.test(msg)) {
    return 'Não foi possível concluir o cadastro. Confira o CPF. Se você já tem conta, use "Esqueci minha senha".';
  }
  if (/already registered|already been registered/i.test(msg)) {
    return 'Este e-mail já está cadastrado. Entre com seu CPF ou use "Esqueci minha senha".';
  }
  if (/Password should be|weak password/i.test(msg)) {
    return 'A senha precisa ter pelo menos 6 caracteres, com letras e números.';
  }
  if (/rate limit|too many/i.test(msg)) {
    return 'Muitas tentativas seguidas. Aguarde alguns minutos.';
  }
  if (/JWT|not authenticated|Não autenticado/i.test(msg)) {
    return 'Sua sessão expirou. Entre novamente.';
  }
  return msg;
}
