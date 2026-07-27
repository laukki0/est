import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabase.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { logActivity } from "./useActivities.js";

export function useFriends() {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) {
      setFriends([]);
      setReceived([]);
      setSent([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [f, r, s] = await Promise.all([
      supabase.rpc("list_friends"),
      supabase.rpc("list_pending_received"),
      supabase.rpc("list_pending_sent"),
    ]);
    setFriends(f.data || []);
    setReceived(r.data || []);
    setSent(s.data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    reload();
    if (!user) return;
    // Qualquer mudança na tabela de amizades (pedido novo, aceite,
    // remoção) recarrega as três listas.
    const channel = supabase
      .channel(`friendships-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friendships" },
        () => reload()
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user, reload]);

  async function searchByEmail(query) {
    if (!query.trim()) return [];
    const { data } = await supabase.rpc("search_users_by_email", { search_query: query.trim() });
    return data || [];
  }

  async function sendRequest(targetId) {
    await supabase.rpc("send_friend_request", { target_id: targetId });
    reload();
  }

  async function acceptRequest(friendshipId, friendName) {
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId);
    logActivity("friend_added", { name: friendName || "" });
    reload();
  }

  async function removeFriendship(friendshipId) {
    await supabase.from("friendships").delete().eq("id", friendshipId);
    reload();
  }

  return { friends, received, sent, loading, searchByEmail, sendRequest, acceptRequest, removeFriendship };
}
