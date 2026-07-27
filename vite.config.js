import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // Carrega todas as variáveis (prefixo "" = sem filtro), incluindo as que a
  // integração Supabase da Vercel injeta com prefixo NEXT_PUBLIC_/SUPABASE_.
  const env = loadEnv(mode, process.cwd(), "");

  // O app cliente lê import.meta.env.VITE_SUPABASE_URL / _PUBLISHABLE_KEY.
  // Aqui mapeamos os nomes fornecidos pela integração para esses nomes VITE_,
  // sem duplicar segredos em nenhum arquivo versionado.
  const supabaseUrl =
    env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || "";
  const supabaseKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    env.SUPABASE_ANON_KEY ||
    "";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
      // Permite o preview da Vercel Sandbox (*.vercel.run) e qualquer host,
      // já que a URL de preview é dinâmica.
      allowedHosts: true,
    },
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabaseKey),
    },
  };
});
