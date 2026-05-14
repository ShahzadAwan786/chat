import React, { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import {
  FiCamera,
  FiUser,
  FiInfo,
  FiCheck,
  FiLoader,
  FiArrowLeft,
} from "react-icons/fi";
import useUserStore from "../store/use-user-store";
import { updateUserProfile } from "../services/user-api";
import { useNavigate } from "react-router-dom";
import useThemeStore from "../store/use-theme-store";
import { useState as useDialogState } from "react";
import Layout from "./layout";

/* ─── Validation ────────────────────────────────────────────── */
const schema = yup.object().shape({
  username: yup
    .string()
    .min(2, "At least 2 characters")
    .max(30, "Max 30 characters")
    .required("Username is required"),
  about: yup.string().max(139, "Max 139 characters").notRequired(),
});

const Spin = () => <FiLoader className="animate-spin inline-block" size={18} />;
const CHAR_LIMIT = 139;

export default function Profile() {
  const { user, setUser } = useUserStore();
  const navigate = useNavigate();
  const { theme } = useThemeStore();
  const [isThemeDialogOpen, setIsThemeDialogOpen] = useState(false);

  const [previewUrl, setPreviewUrl] = useState(user?.profilePicture || null);
  const [pictureFile, setPictureFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      username: user?.userName || "",
      about: user?.about || "",
    },
  });

  const aboutValue = watch("about") || "";

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPictureFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("username", data.username);
      if (data.about) formData.append("about", data.about);
      if (pictureFile) {
        formData.append("media", pictureFile);
      } else if (previewUrl) {
        formData.append("profilePicture", previewUrl);
      }

      const res = await updateUserProfile(formData);
      if (res?.status === "success") {
        setUser(res.data);
        setSaved(true);
        toast.success("Profile updated!");
        setTimeout(() => {
          setSaved(false);
          navigate(-1);
        }, 1200);
      }
    } catch (err) {
      toast.error(err?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const initials = (user?.userName || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Layout
      isThemeDialogOpen={isThemeDialogOpen}
      toggleThemeDialog={() => setIsThemeDialogOpen(!isThemeDialogOpen)}
    >
      <div className="w-full h-screen text-text border-r bg-chat-list-bg border-form-border flex flex-col">
        {/* ── Top bar (matches Settings header style) ────────── */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-form-border">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-contact-hover transition-colors"
          >
            <FiArrowLeft size={18} className="text-text" />
          </button>
          <h1 className="text-xl font-semibold text-text">Edit Profile</h1>
        </div>

        {/* ── Scrollable body ─────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
            {/* ── Avatar section ──────────────────────────────── */}
            <div
              className="flex flex-col items-center gap-3 py-8 border-b border-form-border"
              style={{ background: "var(--form-bg)" }}
            >
              <div className="relative">
                {/* Glow ring */}
                <div
                  className="absolute -inset-1 rounded-full opacity-50 blur-sm"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--primary), #3b82f6)",
                  }}
                />
                <div
                  className="relative w-24 h-24 rounded-full overflow-hidden border-2"
                  style={{ borderColor: "var(--primary)" }}
                >
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-2xl font-bold text-white"
                      style={{
                        background:
                          "linear-gradient(135deg, var(--primary), #3b82f6)",
                      }}
                    >
                      {initials}
                    </div>
                  )}
                </div>

                {/* Camera button */}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                  style={{ background: "var(--primary)" }}
                >
                  <FiCamera size={14} className="text-white" />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <AnimatePresence>
                {pictureFile ? (
                  <motion.p
                    key="hint"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="text-xs font-medium"
                    style={{ color: "var(--primary)" }}
                  >
                    New photo ready to save
                  </motion.p>
                ) : (
                  <motion.p
                    key="tap"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs"
                    style={{ color: "var(--muted)" }}
                  >
                    Tap the camera to change photo
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* ── Fields ──────────────────────────────────────── */}
            <div className="px-4 pt-6 pb-4 space-y-1">
              <p
                className="text-xs font-semibold uppercase tracking-widest px-1 mb-3"
                style={{ color: "var(--primary)" }}
              >
                Your Info
              </p>

              {/* Username row */}
              <div
                className="flex items-center gap-4 px-4 py-3 rounded-xl"
                style={{ background: "var(--form-bg)" }}
              >
                <FiUser
                  size={18}
                  style={{ color: "var(--muted)" }}
                  className="shrink-0"
                />
                <div className="flex-1">
                  <p
                    className="text-xs mb-0.5"
                    style={{ color: "var(--muted)" }}
                  >
                    Username
                  </p>
                  <input
                    {...register("username")}
                    type="text"
                    placeholder="Your display name"
                    className="w-full bg-transparent focus:outline-none text-sm font-medium"
                    style={{ color: "var(--text)" }}
                  />
                </div>
              </div>
              {errors.username && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs px-1"
                  style={{ color: "var(--error)" }}
                >
                  {errors.username.message}
                </motion.p>
              )}
            </div>

            {/* About row */}
            <div className="px-4 pb-4 space-y-1">
              <div
                className="flex items-start gap-4 px-4 py-3 rounded-xl"
                style={{ background: "var(--form-bg)" }}
              >
                <FiInfo
                  size={18}
                  style={{ color: "var(--muted)" }}
                  className="mt-1 shrink-0"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-xs" style={{ color: "var(--muted)" }}>
                      About
                    </p>
                    <span
                      className="text-xs tabular-nums"
                      style={{
                        color:
                          aboutValue.length > CHAR_LIMIT - 20
                            ? "var(--error)"
                            : "var(--muted)",
                      }}
                    >
                      {aboutValue.length}/{CHAR_LIMIT}
                    </span>
                  </div>
                  <textarea
                    {...register("about")}
                    rows={3}
                    placeholder="Hey there! I'm using WhatsApp."
                    className="w-full bg-transparent focus:outline-none text-sm resize-none"
                    style={{ color: "var(--text)" }}
                    maxLength={CHAR_LIMIT}
                  />
                </div>
              </div>
              {errors.about && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs px-1"
                  style={{ color: "var(--error)" }}
                >
                  {errors.about.message}
                </motion.p>
              )}
            </div>

            {/* ── Save button ──────────────────────────────────── */}
            <div className="px-4 pb-8 pt-2">
              <button
                type="submit"
                disabled={loading || saved}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
                style={{
                  background: saved
                    ? "#16a34a"
                    : "linear-gradient(135deg, var(--primary), #16a34a)",
                }}
              >
                <AnimatePresence mode="wait">
                  {saved ? (
                    <motion.span
                      key="saved"
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex items-center gap-1.5"
                    >
                      <FiCheck size={15} /> Saved!
                    </motion.span>
                  ) : loading ? (
                    <motion.span
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <Spin />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      Save Changes
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
