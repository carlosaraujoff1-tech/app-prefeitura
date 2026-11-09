// Edge Function: entrar
// Login por CPF + senha. O Supabase só entra por e-mail; esta função acha o e-mail
// pelo CPF AQUI no servidor (o app nunca vê o e-mail de ninguém) e devolve a sessão.
// Limite: 5 erros por CPF ou 30 por IP a cada 15 minutos.
// Variáveis já existentes no Supabase: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function resposta(status: number, corpo: Record<string, unknown>) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function hash(texto: string) {
  const dados = new TextEncoder().encode(texto);
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", dados));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return resposta(405, { erro: "Método não permitido" });

  let cpf = "";
  let senha = "";
  try {
    const corpo = await req.json();
    cpf = String(corpo.cpf ?? "").replace(/\D/g, "");
    senha = String(corpo.senha ?? "");
  } catch {
    return resposta(400, { erro: "Dados inválidos" });
  }
  if (cpf.length !== 11 || senha.length < 6) {
    return resposta(400, { erro: "Informe o CPF e a senha." });
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  const chaveCpf = "cpf:" + (await hash(cpf));
  const chaveIp = ip ? "ip:" + (await hash(ip)) : null;

  const { data: bloqueado } = await admin.rpc("login_bloqueado", {
    p_chave_cpf: chaveCpf,
    p_chave_ip: chaveIp,
  });
  if (bloqueado) {
    return resposta(429, {
      erro: "Muitas tentativas. Aguarde 15 minutos ou use \"Esqueci minha senha\".",
    });
  }

  const { data: email } = await admin.rpc("login_email_por_cpf", { p_cpf: cpf });
  const publico = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    auth: { persistSession: false },
  });
  // Mesmo sem e-mail, segue o mesmo caminho para não revelar se o CPF existe.
  const { data, error } = await publico.auth.signInWithPassword({
    email: (email as string | null) ?? `inexistente-${chaveCpf.slice(4, 16)}@invalido.local`,
    password: senha,
  });

  await admin.rpc("login_registrar", {
    p_chave_cpf: chaveCpf,
    p_chave_ip: chaveIp,
    p_sucesso: !error,
  });

  if (error || !data.session) {
    if (error?.code === "email_not_confirmed") {
      return resposta(403, {
        erro: "Confirme seu e-mail antes de entrar. Procure a mensagem da Prefeitura na sua caixa de entrada (e no spam).",
      });
    }
    return resposta(401, { erro: "CPF ou senha incorretos." });
  }

  return resposta(200, {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
});
