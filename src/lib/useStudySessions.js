import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { logActivity } from "./useActivities.js";

function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // domingo como início da semana
  return d;
}

export function useStudySessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    if (!user) {
      setSessions([]);
      return;
    }

    let active = true;

    async function load() {
      const { data } = await supabase
        .from("study_sessions")
        .select("materia, segundos, started_at")
        .eq("user_id", user.id)
        .gte("started_at", startOfWeek(new Date()).toISOString());
      if (active) setSessions(data || []);
    }
    load();

    // Sessão nova é sempre um INSERT - reagimos e recarregamos a semana
    // inteira (mais simples que mesclar manualmente o payload).
    const channel = supabase
      .channel(`sessions-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "study_sessions", filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  async function salvarSessao(materia, segundos) {
    if (!user || segundos < 1) return;
    await supabase.from("study_sessions").insert({
      materia,
      segundos,
      started_at: new Date(Date.now() - segundos * 1000).toISOString(),
    });
    logActivity("study_session", { materia, minutes: Math.round(segundos / 60) });
  }

  const porDia = useMemo(() => {
    const totals = [0, 0, 0, 0, 0, 0, 0];
    sessions.forEach((s) => {
      const dia = new Date(s.started_at).getDay();
      totals[dia] += s.segundos || 0;
    });
    return totals.map((seg) => Math.round(seg / 60));
  }, [sessions]);

  const porMateria = useMemo(() => {
    const map = new Map();
    sessions.forEach((s) => {
      const atual = map.get(s.materia) || 0;
      map.set(s.materia, atual + (s.segundos || 0));
    });
    return Array.from(map.entries())
      .map(([materia, segundos]) => ({ materia, minutos: Math.round(segundos / 60) }))
      .sort((a, b) => b.minutos - a.minutos);
  }, [sessions]);

  const totalSemana = useMemo(
    () => sessions.reduce((acc, s) => acc + (s.segundos || 0), 0),
    [sessions]
  );

  return { sessions, salvarSessao, porDia, porMateria, totalSemana };
}
