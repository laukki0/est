import { createClient } from "@supabase/supabase-js";

// URL e chave publishable do seu projeto Supabase (Dashboard → Settings →
// API Keys). A chave publishable não é secreta - é assim que o Supabase
// funciona no cliente, igual a chave pública do Firebase antes dela. A
// segurança real vem das políticas de Row Level Security (RLS) em
// supabase/schema.sql.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY não configuradas. Veja o .env.local.example."
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
