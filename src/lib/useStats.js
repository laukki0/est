import { useEffect, useState } from "react";
import { supabase } from "../supabase.js";
import { useAuth } from "../contexts/AuthContext.jsx";

const EMPTY_STATS = {
  flashcardsViewed: 0,
  questionsAnswered: 0,
  correctAnswers: 0,
  drillsAnswered: 0,
  drillsCorrect: 0,
};

function fromRow(row) {
  if (!row) return EMPTY_STATS;
  return {
    flashcardsViewed: row.flashcards_viewed ?? 0,
    questionsAnswered: row.questions_answered ?? 0,
    correctAnswers: row.correct_answers ?? 0,
    drillsAnswered: row.drills_answered ?? 0,
    drillsCorrect: row.drills_correct ?? 0,
  };
}

export function useStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState(EMPTY_STATS);

  useEffect(() => {
    if (!user) {
      setStats(EMPTY_STATS);
      return;
    }

    let active = true;

    async function load() {
      const { data } = await supabase
        .from("study_stats")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (active) setStats(fromRow(data));
    }
    load();

    const channel = supabase
      .channel(`stats-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "study_stats", filter: `user_id=eq.${user.id}` },
        (payload) => setStats(fromRow(payload.new))
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  async function registrarFlashcardVisto() {
    if (!user) return;
    await supabase.rpc("increment_flashcard_viewed");
  }

  async function registrarResposta(correta) {
    if (!user) return;
    await supabase.rpc("record_quiz_answer", { is_correct: correta });
  }

  async function registrarRespostaDrill(correta) {
    if (!user) return;
    await supabase.rpc("record_drill_answer", { is_correct: correta });
  }

  return { stats, registrarFlashcardVisto, registrarResposta, registrarRespostaDrill };
}
