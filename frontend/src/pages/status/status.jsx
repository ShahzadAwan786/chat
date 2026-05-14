import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import {
  FiPlus,
  FiX,
  FiSend,
  FiImage,
  FiVideo,
  FiType,
  FiTrash2,
  FiEye,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import useStatusStore from "../../store/use-status-store";
import {
  fetchStatuses,
  createStatus,
  viewStatusApi,
  deleteStatusApi,
} from "../../services/status-api";
import Layout from "../../components/layout";
import useUserStore from "../../store/use-user-store";

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function groupStatuses(statuses, currentUserId) {
  const map = new Map();
  for (const s of statuses) {
    const uid = s.user?._id;
    if (!map.has(uid)) map.set(uid, { user: s.user, items: [] });
    map.get(uid).items.push(s);
  }
  const mine = map.get(currentUserId);
  if (mine) map.delete(currentUserId);
  return { mine: mine || null, others: [...map.values()] };
}

/* ─── Avatar ring ───────────────────────────────────────────── */
function Avatar({ src, name, size = 12, ring = false, unseen = false }) {
  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const ringStyle = ring
    ? unseen
      ? { borderColor: "var(--primary)", borderWidth: 2 }
      : { borderColor: "var(--muted)", borderWidth: 2 }
    : {};

  return (
    <div
      className={`w-${size} h-${size} rounded-full overflow-hidden border-2 shrink-0`}
      style={ringStyle}
    >
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center text-white text-sm font-bold"
          style={{
            background: "linear-gradient(135deg, var(--primary), #3b82f6)",
          }}
        >
          {initials}
        </div>
      )}
    </div>
  );
}

/* ─── Progress bar (story-style) ───────────────────────────── */
function ProgressBars({ total, current, duration = 5000, onNext }) {
  const [progress, setProgress] = useState(0);
  const raf = useRef(null);
  const start = useRef(null);

  useEffect(() => {
    setProgress(0);
    start.current = null;

    const animate = (ts) => {
      if (!start.current) start.current = ts;
      const pct = Math.min(((ts - start.current) / duration) * 100, 100);
      setProgress(pct);
      if (pct < 100) {
        raf.current = requestAnimationFrame(animate);
      } else {
        onNext();
      }
    };
    raf.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf.current);
  }, [current]);

  return (
    <div className="flex gap-1 w-full px-3 pt-3">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="flex-1 h-0.5 rounded-full overflow-hidden"
          style={{ background: "rgba(255,255,255,0.35)" }}
        >
          <div
            className="h-full rounded-full"
            style={{
              background: "white",
              width:
                i < current ? "100%" : i === current ? `${progress}%` : "0%",
              transition: i === current ? "none" : undefined,
            }}
          />
        </div>
      ))}
    </div>
  );
}

/* ─── Story viewer ──────────────────────────────────────────── */
function StoryViewer({ group, onClose, onDelete, currentUserId }) {
  const [idx, setIdx] = useState(0);
  const status = group.items[idx];
  const isOwn = group.user?._id === currentUserId;

  const handleNext = () => {
    if (idx < group.items.length - 1) setIdx((i) => i + 1);
    else onClose();
  };
  const handlePrev = () => {
    if (idx > 0) setIdx((i) => i - 1);
  };

  useEffect(() => {
    viewStatusApi(status._id).catch(() => {});
  }, [status._id]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(8px)" }}
    >
      <div className="relative w-full max-w-sm h-[85vh] rounded-2xl overflow-hidden flex flex-col bg-black">
        {/* Progress */}
        <ProgressBars
          total={group.items.length}
          current={idx}
          duration={status.contentType === "video" ? 15000 : 5000}
          onNext={handleNext}
        />

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 z-10">
          <Avatar
            src={group.user?.profilePicture}
            name={group.user?.userName}
            size={10}
          />
          <div className="flex-1">
            <p className="text-white text-sm font-semibold">
              {group.user?.userName}
            </p>
            <p className="text-white/60 text-xs">{timeAgo(status.createdAt)}</p>
          </div>
          {isOwn && (
            <button
              onClick={() => onDelete(status._id)}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10"
            >
              <FiTrash2 size={15} className="text-red-400" />
            </button>
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10"
          >
            <FiX size={16} className="text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 relative flex items-center justify-center">
          {status.contentType === "image" && (
            <img
              src={status.content}
              alt=""
              className="w-full h-full object-contain"
            />
          )}
          {status.contentType === "video" && (
            <video
              src={status.content}
              autoPlay
              className="w-full h-full object-contain"
            />
          )}
          {status.contentType === "text" && (
            <div
              className="w-full h-full flex items-center justify-center p-8"
              style={{
                background: "linear-gradient(135deg, var(--primary), #3b82f6)",
              }}
            >
              <p className="text-white text-2xl font-semibold text-center leading-snug">
                {status.content}
              </p>
            </div>
          )}

          {/* Prev / Next tap zones */}
          <button
            onClick={handlePrev}
            className="absolute left-0 top-0 w-1/3 h-full"
          />
          <button
            onClick={handleNext}
            className="absolute right-0 top-0 w-1/3 h-full"
          />
        </div>

        {/* Viewer count */}
        {isOwn && (
          <div className="flex items-center gap-2 px-4 py-3 bg-black/40">
            <FiEye size={14} className="text-white/70" />
            <span className="text-white/70 text-xs">
              {status.viewers?.length || 0} viewer
              {status.viewers?.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Create status sheet ───────────────────────────────────── */
function CreateStatusSheet({ onClose, onCreated }) {
  const [tab, setTab] = useState("text"); // text | image | video
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setTab(f.type.startsWith("video") ? "video" : "image");
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const formData = new FormData();
      if (tab === "text") {
        if (!text.trim()) return toast.error("Write something first");
        formData.append("content", text);
        formData.append("contentType", "text");
      } else {
        if (!file) return toast.error("Pick a file first");
        formData.append("media", file);
      }
      const res = await createStatus(formData);
      if (res?.status === "success") {
        toast.success("Status posted!");
        onCreated(res.data);
        onClose();
      }
    } catch (err) {
      toast.error(err?.message || "Failed to post status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="w-full max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ background: "var(--dialog-bg)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <span className="font-semibold text-text">New Status</span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "var(--form-bg)" }}
          >
            <FiX size={15} style={{ color: "var(--muted)" }} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
          {[
            { id: "text", icon: <FiType size={15} />, label: "Text" },
            { id: "image", icon: <FiImage size={15} />, label: "Photo" },
            { id: "video", icon: <FiVideo size={15} />, label: "Video" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                if (t.id !== "text") fileRef.current?.click();
              }}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors"
              style={{
                color: tab === t.id ? "var(--primary)" : "var(--muted)",
                borderBottom:
                  tab === t.id
                    ? "2px solid var(--primary)"
                    : "2px solid transparent",
              }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFile}
          className="hidden"
        />

        {/* Body */}
        <div className="p-5">
          {tab === "text" ? (
            <textarea
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={200}
              placeholder="What's on your mind?"
              className="w-full bg-transparent focus:outline-none text-text resize-none text-lg placeholder:text-muted"
              style={{ color: "var(--text)" }}
            />
          ) : preview ? (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
              {tab === "video" ? (
                <video
                  src={preview}
                  controls
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={preview}
                  alt=""
                  className="w-full h-full object-contain"
                />
              )}
              <button
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                  setTab("text");
                }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center bg-black/60"
              >
                <FiX size={13} className="text-white" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2"
              style={{ borderColor: "var(--form-border)" }}
            >
              {tab === "video" ? (
                <FiVideo size={28} style={{ color: "var(--muted)" }} />
              ) : (
                <FiImage size={28} style={{ color: "var(--muted)" }} />
              )}
              <span className="text-sm" style={{ color: "var(--muted)" }}>
                Tap to select {tab === "video" ? "a video" : "a photo"}
              </span>
            </button>
          )}
        </div>

        {/* Submit */}
        <div className="px-5 pb-6">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity hover:opacity-90"
            style={{
              background: "linear-gradient(135deg, var(--primary), #16a34a)",
            }}
          >
            {loading ? (
              <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4" />
            ) : (
              <>
                <FiSend size={15} /> Post Status
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Main Status Page ──────────────────────────────────────── */
export default function Status() {
  const { user } = useUserStore();
  const {
    statuses,
    myStatus,
    setStatuses,
    setMyStatus,
    addStatus,
    removeStatus,
  } = useStatusStore();
  const [isThemeDialogOpen, setIsThemeDialogOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [viewingGroup, setViewingGroup] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  /* fetch */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetchStatuses();
        if (res?.status === "success") {
          const all = res.data;
          setStatuses(all);
          setMyStatus(all.filter((s) => s.user?._id === user?._id));
        }
      } catch (err) {
        toast.error("Failed to load statuses");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const { mine, others } = groupStatuses(statuses, user?._id);

  const handleDelete = async (statusId) => {
    try {
      await deleteStatusApi(statusId);
      removeStatus(statusId);
      toast.success("Status deleted");
      setViewingGroup(null);
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleCreated = (newStatus) => {
    addStatus(newStatus);
    setStatuses([newStatus, ...statuses]);
    setMyStatus([newStatus, ...myStatus]);
  };

  const seenIds = new Set(); // track which user statuses the current user already saw

  return (
    <Layout
      isThemeDialogOpen={isThemeDialogOpen}
      toggleThemeDialog={() => setIsThemeDialogOpen(!isThemeDialogOpen)}
    >
      <div className="w-full h-screen flex flex-col bg-chat-list-bg border-r border-form-border text-text overflow-hidden">
        {/* ── Header ─────────────────────────────────────── */}
        <div className="px-4 py-4 border-b border-form-border">
          <h1 className="text-xl font-semibold">Status</h1>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* ── My status ──────────────────────────────────── */}
          <div className="px-4 pt-4 pb-2">
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: "var(--muted)" }}
            >
              My Status
            </p>
            <div
              className="flex items-center gap-4 p-3 rounded-xl hover:bg-contact-hover cursor-pointer transition-colors"
              onClick={() =>
                mine ? setViewingGroup(mine) : setShowCreate(true)
              }
            >
              <div className="relative">
                <Avatar
                  src={user?.profilePicture}
                  name={user?.userName}
                  size={12}
                  ring={!!mine}
                  unseen={!!mine}
                />
                {!mine && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCreate(true);
                    }}
                    className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center shadow"
                    style={{ background: "var(--primary)" }}
                  >
                    <FiPlus size={11} className="text-white" />
                  </button>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text">My Status</p>
                <p
                  className="text-xs truncate"
                  style={{ color: "var(--muted)" }}
                >
                  {mine
                    ? `${mine.items.length} update${mine.items.length > 1 ? "s" : ""} · ${timeAgo(mine.items[0].createdAt)}`
                    : "Tap to add status update"}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCreate(true);
                }}
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "var(--form-bg)" }}
              >
                <FiPlus size={16} style={{ color: "var(--primary)" }} />
              </button>
            </div>
          </div>

          {/* ── Recent updates ─────────────────────────────── */}
          {others.length > 0 && (
            <div className="px-4 pt-2 pb-4">
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-3"
                style={{ color: "var(--muted)" }}
              >
                Recent Updates
              </p>

              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-3 rounded-xl animate-pulse"
                  >
                    <div className="w-12 h-12 rounded-full bg-form-bg shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 rounded bg-form-bg w-2/3" />
                      <div className="h-2.5 rounded bg-form-bg w-1/3" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="space-y-1">
                  {others.map((group) => {
                    const latest = group.items[0];
                    const hasUnseen = !latest.viewers?.some(
                      (v) => (v._id || v) === user?._id,
                    );
                    return (
                      <motion.div
                        key={group.user?._id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-4 p-3 rounded-xl hover:bg-contact-hover cursor-pointer transition-colors"
                        onClick={() => setViewingGroup(group)}
                      >
                        <Avatar
                          src={group.user?.profilePicture}
                          name={group.user?.userName}
                          size={12}
                          ring
                          unseen={hasUnseen}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-text">
                            {group.user?.userName}
                          </p>
                          <p
                            className="text-xs truncate"
                            style={{ color: "var(--muted)" }}
                          >
                            {group.items.length} update
                            {group.items.length > 1 ? "s" : ""}
                            {" · "}
                            {timeAgo(latest.createdAt)}
                          </p>
                        </div>
                        {hasUnseen && (
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ background: "var(--primary)" }}
                          />
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!loading && others.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-6 gap-3">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: "var(--form-bg)" }}
              >
                <FiEye size={26} style={{ color: "var(--muted)" }} />
              </div>
              <p className="text-sm font-medium text-text">No recent updates</p>
              <p
                className="text-xs text-center"
                style={{ color: "var(--muted)" }}
              >
                Status updates from your contacts will appear here
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Overlays ──────────────────────────────────────────── */}
      <AnimatePresence>
        {viewingGroup && (
          <StoryViewer
            group={viewingGroup}
            onClose={() => setViewingGroup(null)}
            onDelete={handleDelete}
            currentUserId={user?._id}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreate && (
          <CreateStatusSheet
            onClose={() => setShowCreate(false)}
            onCreated={handleCreated}
          />
        )}
      </AnimatePresence>
    </Layout>
  );
}
