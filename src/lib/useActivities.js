import { useEffect, useState } from "react";
import { supabase } from "../supabase.js";
import { useAuth } from "../contexts/AuthContext.jsx";

export function useActivities() {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setActivities([]);
      setLoading(false);
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      const { data } = await supabase.rpc("get_activity_feed", { limit_count: 30 });
      if (active) setActivities(data || []);
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel(`activities-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activities" }, () => load())
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { activities, loading };
}

/** Registra um evento novo no feed (não precisa estar dentro de um componente React). */
export async function logActivity(type, payload = {}) {
  await supabase.from("activities").insert({ type, payload });
}
