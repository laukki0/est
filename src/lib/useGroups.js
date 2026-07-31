import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabase.js";
import { useAuth } from "../contexts/AuthContext.jsx";

export function useGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) {
      setGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase.rpc("list_my_groups");
    setGroups(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    reload();
    if (!user) return;
    // Qualquer mudança nos grupos ou nas participações do usuário recarrega a lista.
    const channel = supabase
      .channel(`groups-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "study_groups" }, () => reload())
      .on("postgres_changes", { event: "*", schema: "public", table: "group_members" }, () => reload())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user, reload]);

  async function createGroup(name, description) {
    const { data, error } = await supabase.rpc("create_group", {
      group_name: name,
      group_description: description || "",
    });
    if (error) throw error;
    await reload();
    return data;
  }

  async function joinByCode(code) {
    const { data, error } = await supabase.rpc("join_group_by_code", { code });
    if (error) throw error;
    await reload();
    return data;
  }

  async function leaveGroup(groupId) {
    const { error } = await supabase.rpc("leave_group", { target_group_id: groupId });
    if (error) throw error;
    await reload();
  }

  async function listMembers(groupId) {
    const { data, error } = await supabase.rpc("list_group_members", { target_group_id: groupId });
    if (error) throw error;
    return data || [];
  }

  return { groups, loading, createGroup, joinByCode, leaveGroup, listMembers };
}
