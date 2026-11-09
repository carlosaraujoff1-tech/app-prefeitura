// Edge Function: recuperar-senha
// O cidadão informa o CPF; enviamos o link de nova senha para o e-mail cadastrado
// e mostramos o e-mail "mascarado" (ex.: ca***@gmail.com) para ele saber onde olhar.
// Mesmo limite de tentativas da função "entrar".
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const REDIRECIONAR_PARA = "sapcidadao://redefinir-senha";

function resposta(status: number, corpo: Record<string, unknown>) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function hash(texto: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto)));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function mascarar(email: string) {
  const [usuario, dominio] = email.split("@");
  const visivel = usuario.slice(0, Math.min(2, usuario.length));
  return `${visivel}***@${dominio}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return resposta(405, { erro: "Método não permitido" });

  let cpf = "";
  try {
    cpf = String((await req.json()).cpf ?? "").replace(/\D/g, "");
  } catch {
    return resposta(400, { erro: "Dados inválidos" });
  }
  if (cpf.length !== 11) return resposta(400, { erro: "Informe um CPF válido." });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  const chaveCpf = "rec:" + (await hash(cpf));
  const chaveIp = ip ? "recip:" + (await hash(ip)) : null;

  const { data: bloqueado } = await admin.rpc("login_bloqueado", { p_chave_cpf: chaveCpf, p_chave_ip: chaveIp });
  if (bloqueado) return resposta(429, { erro: "Muitas tentativas. Aguarde 15 minutos." });

  const { data: email } = await admin.rpc("login_email_por_cpf", { p_cpf: cpf });
  // Conta cada pedido como "falha" para limitar abusos (5 pedidos por CPF a cada 15 min).
  await admin.rpc("login_registrar", { p_chave_cpf: chaveCpf, p_chave_ip: chaveIp, p_sucesso: false });

  if (!email) {
    return resposta(404, { erro: "Não encontramos cadastro com este CPF. Confira os números ou crie sua conta." });
  }
  const { error } = await admin.auth.resetPasswordForEmail(email as string, { redirectTo: REDIRECIONAR_PARA });
  if (error) {
    return resposta(500, { erro: "Não foi possível enviar o e-mail agora. Tente de novo em alguns minutos." });
  }
  return resposta(200, { email_mascarado: mascarar(email as string) });
});
