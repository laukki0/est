import React, { useEffect, useState } from "react";
import { Check, Copy, Crown, LogOut, Plus, Share2, Users2 } from "lucide-react";
import { useT } from "../contexts/PrefsContext.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useGroups } from "../lib/useGroups.js";

function Avatar({ photoUrl, name, size = 36 }) {
  return (
    <img
      src={photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || "?")}`}
      alt=""
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
    />
  );
}

function CopyCodeButton({ code }) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // clipboard pode não estar disponível (ex: http sem permissão) - ignora
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      className="btn-ghost btn"
      style={{ fontSize: 12, padding: "6px 10px", fontFamily: "monospace", letterSpacing: 1 }}
      onClick={handleCopy}
      title={t("groups_copy_code")}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {code}
    </button>
  );
}

function ShareInviteButton({ code, groupName }) {
  const t = useT();
  const [done, setDone] = useState(false);

  async function handleShare() {
    const url = `${window.location.origin}/convite/${code}`;
    const text = t("groups_invite_share_text", { name: groupName });
    try {
      if (navigator.share) {
        await navigator.share({ title: groupName, text, url });
        return;
      }
    } catch {
      // usuário cancelou o compartilhamento - cai pro clipboard abaixo
    }
    try {
      await navigator.clipboard.writeText(url);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      // sem clipboard disponível também - nada mais a fazer
    }
  }

  return (
    <button className="btn-ghost btn" style={{ padding: 6 }} onClick={handleShare} title={t("groups_invite_share")}>
      {done ? <Check size={14} /> : <Share2 size={14} />}
    </button>
  );
}

function GroupMembers({ groupId, listMembers }) {
  const t = useT();
  const [members, setMembers] = useState(null);

  useEffect(() => {
    let active = true;
    listMembers(groupId).then((data) => {
      if (active) setMembers(data);
    });
    return () => {
      active = false;
    };
  }, [groupId, listMembers]);

  if (members === null) return <div className="empty">...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
      {members.map((m) => {
        const accuracy =
          m.questions_answered > 0 ? Math.round((m.correct_answers / m.questions_answered) * 100) : null;
        return (
          <div
            key={m.user_id}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}
          >
            <Avatar photoUrl={m.photo_url} name={m.display_name} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                {m.display_name || "—"}
                {m.is_owner && <Crown size={13} color="#F2C94C" />}
              </div>
              <div className="empty" style={{ fontSize: 12 }}>
                {t("groups_member_stats", {
                  correct: m.correct_answers,
                  accuracy: accuracy !== null ? `${accuracy}%` : "—",
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GroupCard({ group, listMembers, leaveGroup, isGuest }) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => setExpanded((v) => !v)}>
          <div style={{ fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
            {group.name}
            {group.is_owner && <Crown size={14} color="#F2C94C" />}
          </div>
          {group.description && (
            <div className="empty" style={{ fontSize: 13, marginTop: 2 }}>
              {group.description}
            </div>
          )}
          <div className="empty" style={{ fontSize: 12, marginTop: 4 }}>
            {t("groups_member_count", { count: group.member_count })}
          </div>
        </div>
        <CopyCodeButton code={group.invite_code} />
        <ShareInviteButton code={group.invite_code} groupName={group.name} />
        <button
          className="btn-ghost btn"
          style={{ padding: 6 }}
          onClick={() => leaveGroup(group.id)}
          title={t("groups_leave")}
          disabled={isGuest}
        >
          <LogOut size={14} />
        </button>
      </div>
      {expanded && <GroupMembers groupId={group.id} listMembers={listMembers} />}
    </div>
  );
}

export default function StudyGroups() {
  const t = useT();
  const { isGuest } = useAuth();
  const { groups, loading, createGroup, joinByCode, leaveGroup, listMembers } = useGroups();

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      await createGroup(name, description);
      setName("");
      setDescription("");
      setShowCreate(false);
    } catch {
      setCreateError(t("groups_create_error"));
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin() {
    if (!joinCode.trim()) return;
    setJoining(true);
    setJoinError("");
    try {
      await joinByCode(joinCode);
      setJoinCode("");
    } catch {
      setJoinError(t("groups_join_error"));
    } finally {
      setJoining(false);
    }
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="hand">{t("groups_title")}</h1>
          <p>{t("groups_subtitle")}</p>
        </div>
      </div>
      <div className="content">
        {isGuest && <div className="empty">{t("guest_no_changes")}</div>}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            className="input"
            style={{ flex: 1, minWidth: 160 }}
            placeholder={t("groups_join_placeholder")}
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            maxLength={6}
            disabled={isGuest}
          />
          <button className="btn-ghost btn" onClick={handleJoin} disabled={joining || !joinCode.trim() || isGuest}>
            {t("groups_join_button")}
          </button>
          <button className="btn" onClick={() => setShowCreate((v) => !v)} disabled={isGuest}>
            <Plus size={16} />
            {t("groups_create_button")}
          </button>
        </div>
        {joinError && <div className="empty">{joinError}</div>}

        {showCreate && (
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              className="input"
              placeholder={t("groups_name_placeholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
            />
            <input
              className="input"
              placeholder={t("groups_description_placeholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={140}
            />
            {createError && <div className="empty">{createError}</div>}
            <button className="btn" onClick={handleCreate} disabled={creating || !name.trim()}>
              {t("groups_create_confirm")}
            </button>
          </div>
        )}

        <div>
          {loading && <div className="empty">...</div>}
          {!loading && groups.length === 0 && (
            <div className="empty" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Users2 size={16} />
              {t("groups_empty")}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {groups.map((g) => (
              <GroupCard key={g.id} group={g} listMembers={listMembers} leaveGroup={leaveGroup} isGuest={isGuest} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
