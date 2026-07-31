import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabase.js";
import { useAuth } from "./AuthContext.jsx";
import { translations, formatT } from "../i18n/translations.js";

const PrefsContext = createContext(null);

const DEFAULT_PREFS = {
  theme: "dark",
  language: "pt",
  display_name: "",
  email: "",
  photo_url: "",
  country: "",
  state: "",
  focus_area: "",
};

export function PrefsProvider({ children }) {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);

  useEffect(() => {
    if (!user) {
      setPrefs(DEFAULT_PREFS);
      return;
    }

    let active = true;

    async function load() {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (active && data) setPrefs((p) => ({ ...p, ...data }));
    }
    load();

    // Equivalente ao onSnapshot do Firestore: reage a mudanças feitas em
    // outra aba/dispositivo em tempo real.
    const channel = supabase
      .channel(`profile-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload) => setPrefs((p) => ({ ...p, ...payload.new }))
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", prefs.theme);
  }, [prefs.theme]);

  async function updatePrefs(partial) {
    setPrefs((p) => ({ ...p, ...partial }));
    if (!user) return;
    await supabase.from("profiles").update(partial).eq("id", user.id);
  }

  return <PrefsContext.Provider value={{ prefs, updatePrefs }}>{children}</PrefsContext.Provider>;
}

export function usePrefs() {
  return useContext(PrefsContext);
}

/** Hook de tradução: t("chave") ou t("chave_com_vars", { n: 1, total: 5 }) */
export function useT() {
  const { prefs } = usePrefs();
  const dict = translations[prefs.language] || translations.pt;
  return (key, vars) => formatT(dict[key] ?? translations.pt[key] ?? key, vars);
}

/** Lista de dias da semana traduzida (array, não passa por t()) */
export function useWeekdays() {
  const { prefs } = usePrefs();
  return translations[prefs.language]?.weekdays || translations.pt.weekdays;
}

/** Instrução de idioma a incluir no system prompt das chamadas de IA */
export function useAiLanguageInstruction() {
  const { prefs } = usePrefs();
  const dict = translations[prefs.language] || translations.pt;
  return dict.ai_language_instruction;
}
