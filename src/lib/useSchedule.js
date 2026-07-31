import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabase.js";
import { useAuth } from "../contexts/AuthContext.jsx";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function useSchedule() {
  const { user } = useAuth();
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) {
      setBlocks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("schedule_blocks")
      .select("*")
      .eq("user_id", user.id)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });
    setBlocks(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    reload();
    if (!user) return;
    const channel = supabase
      .channel(`schedule-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "schedule_blocks" }, () => reload())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user, reload]);

  async function addBlock({ dayOfWeek, subject, startTime, endTime, color }) {
    const { error } = await supabase.from("schedule_blocks").insert({
      user_id: user.id,
      day_of_week: dayOfWeek,
      subject,
      start_time: startTime,
      end_time: endTime,
      color,
    });
    if (error) throw error;
    await reload();
  }

  async function deleteBlock(id) {
    const { error } = await supabase.from("schedule_blocks").delete().eq("id", id);
    if (error) throw error;
    await reload();
  }

  async function toggleDone(block) {
    const isDoneToday = block.last_done_date === todayStr();
    const { error } = await supabase
      .from("schedule_blocks")
      .update({ last_done_date: isDoneToday ? null : todayStr() })
      .eq("id", block.id);
    if (error) throw error;
    await reload();
  }

  return { blocks, loading, addBlock, deleteBlock, toggleDone, todayStr: todayStr() };
}
