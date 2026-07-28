/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Bug,
  X,
  CheckCircle2,
  AlertCircle,
  Send,
  Trash2,
  Camera,
  Loader2,
  Mail,
} from "lucide-react";
import { createPortal } from "react-dom";
import { isLoggedIn, getProfile, type UserProfile } from "@/lib/store";

interface ReportBugModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReportBugModal({ isOpen, onClose }: ReportBugModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [mounted, setMounted] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto populate nama & email jika user login
  useEffect(() => {
    if (isOpen) {
      const fetchUserProfile = async () => {
        if (isLoggedIn()) {
          const profile: UserProfile | null = await getProfile();
          if (profile) {
            setName((prev) => prev || profile.name || "");
            setEmail((prev) => prev || profile.email || "");
          }
        }
      };
      fetchUserProfile();
    }
  }, [isOpen]);

  // Handle preview file URL cleanup
  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  if (!isOpen || !mounted || typeof document === "undefined") return null;

  const handleFileChange = (file: File | undefined) => {
    if (!file) return;

    // Cek ukuran max 5MB
    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran file foto terlalu besar (Maksimal 5 MB).");
      return;
    }

    // Cek format gambar
    if (!file.type.startsWith("image/")) {
      setError("Format file harus berupa gambar (PNG, JPG, WEBP, dll).");
      return;
    }

    setError("");
    setPhotoFile(file);
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleRemovePhoto = () => {
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError("Harap isi Judul Bug dan Deskripsi Lengkap terlebih dahulu.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      const formData = new FormData();
      formData.append("name", name.trim() || "Pengguna AppScript Generator");
      formData.append("email", email.trim() || "no-reply@appscriptgenerator.id");
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("page_url", window.location.href);
      formData.append("user_agent", navigator.userAgent);
      if (photoFile) {
        formData.append("attachment", photoFile);
      }

      // 1. Coba kirim ke server route lokal (/api/report-bug)
      let res = await fetch("/api/report-bug", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        // 2. Jika server lokal error/timeout, fallback ke client-side FormSubmit
        const targetEmail = "firdausrizki76@gmail.com";
        const submitUrl = `https://formsubmit.co/ajax/${targetEmail}`;

        const fallbackData = new FormData();
        fallbackData.append("name", name.trim() || "Pengguna AppScript Generator");
        fallbackData.append("email", email.trim() || "no-reply@appscriptgenerator.id");
        fallbackData.append("_subject", `🚨 [BUG REPORT] ${title.trim()}`);
        fallbackData.append("_template", "table");
        fallbackData.append("_captcha", "false");
        fallbackData.append("Judul Bug", title.trim());
        fallbackData.append("Deskripsi Bug", description.trim());
        fallbackData.append("Halaman URL", window.location.href);
        fallbackData.append("Waktu Laporan", new Date().toLocaleString("id-ID"));
        fallbackData.append("User Agent", navigator.userAgent);
        if (photoFile) {
          fallbackData.append("attachment", photoFile);
        }

        res = await fetch(submitUrl, {
          method: "POST",
          body: fallbackData,
          headers: {
            "Accept": "application/json",
          },
        });

        if (!res.ok) {
          throw new Error("Gagal mengirim laporan bug. Silakan coba kembali.");
        }
      }

      setIsSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan saat mengirim laporan. Coba beberapa saat lagi.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setTitle("");
    setDescription("");
    handleRemovePhoto();
    setIsSuccess(false);
    setError("");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-surface-950/80 backdrop-blur-md animate-fade-up overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg my-auto overflow-hidden rounded-2xl bg-surface-900 border border-amber-500/30 shadow-2xl shadow-amber-500/10 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glowing top border gradient */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-red-500 to-amber-400" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-800 bg-surface-900/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-inner">
              <Bug className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Lapor Bug & Feedback</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/25">
                  Direct Email
                </span>
              </h3>
              <p className="text-xs text-surface-400">
                Kirim langsung ke <span className="text-amber-300 font-medium">firdausrizki76@gmail.com</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-3.5">
          {isSuccess ? (
            <div className="py-8 text-center space-y-4 animate-fade-up">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-bold text-white">Laporan Bug Terkirim!</h4>
                <p className="text-sm text-surface-300 max-w-sm mx-auto leading-relaxed">
                  Laporan Anda beserta bukti foto telah dikirimkan ke email{" "}
                  <strong className="text-amber-300">firdausrizki76@gmail.com</strong>.
                </p>
              </div>
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-surface-800 hover:bg-surface-700 transition cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  onClick={handleResetForm}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 transition cursor-pointer"
                >
                  Lapor Bug Lainnya
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Grid Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-surface-300 mb-1">
                    Nama Pelapor (Opsional)
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama Anda"
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-800 text-sm text-white placeholder-surface-500 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-300 mb-1">
                    Email Anda (Opsional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@domain.com"
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-800 text-sm text-white placeholder-surface-500 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>

              {/* Judul Bug */}
              <div>
                <label className="block text-xs font-medium text-surface-200 mb-1">
                  Judul Bug / Masalah <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Tombol download tidak aktif di halaman hasil"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-surface-800 text-sm text-white placeholder-surface-500 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              {/* Deskripsi Bug */}
              <div>
                <label className="block text-xs font-medium text-surface-200 mb-1">
                  Deskripsi & Langkah Terjadi <span className="text-red-400">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Jelaskan secara detail bagaimana bug terjadi dan langkah sebelumnya..."
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-800 text-sm text-white placeholder-surface-500 focus:outline-none focus:border-amber-500 transition resize-none"
                />
              </div>

              {/* Upload Foto Bug */}
              <div>
                <label className="block text-xs font-medium text-surface-200 mb-1">
                  Unggah Foto / Screenshot Bug (Disarankan)
                </label>

                {!photoPreview ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`group relative flex flex-col items-center justify-center p-3.5 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                      isDragging
                        ? "border-amber-500 bg-amber-500/10"
                        : "border-surface-700 hover:border-amber-500/50 bg-surface-950/60 hover:bg-surface-900/60"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e.target.files?.[0])}
                      className="hidden"
                    />
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-850 border border-surface-750 text-surface-400 group-hover:text-amber-400 group-hover:border-amber-500/30 transition mb-1.5">
                      <Camera className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-semibold text-surface-200 group-hover:text-amber-300 transition text-center">
                      Klik atau seret foto bug ke sini
                    </p>
                    <p className="text-[11px] text-surface-400 mt-0.5">
                      Format PNG, JPG, WEBP (Maks. 5MB)
                    </p>
                  </div>
                ) : (
                  <div className="relative p-3 rounded-xl bg-surface-950 border border-amber-500/30 flex items-center gap-3">
                    <div className="relative h-14 w-14 rounded-lg overflow-hidden bg-surface-900 border border-surface-800 shrink-0">
                      <img
                        src={photoPreview}
                        alt="Preview Bug"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">
                        {photoFile?.name}
                      </p>
                      <p className="text-[11px] text-amber-400/80 font-medium">
                        {photoFile && formatFileSize(photoFile.size)} • Siap dilampirkan
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-surface-300 bg-surface-850 hover:bg-surface-800 hover:text-white transition cursor-pointer"
                      >
                        Ganti
                      </button>
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="p-1.5 rounded-lg text-red-400 bg-red-500/10 hover:bg-red-500/20 transition cursor-pointer"
                        title="Hapus foto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e.target.files?.[0])}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              {/* Footer info */}
              <div className="pt-2 flex items-center justify-between gap-3 border-t border-surface-850">
                <p className="text-[11px] text-surface-400 truncate max-w-[220px]">
                  URL aktif: <span className="text-surface-300 font-mono">{typeof window !== "undefined" ? window.location.pathname : ""}</span>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-surface-400 hover:text-white hover:bg-surface-800 transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-amber-950 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 hover:from-amber-300 hover:to-amber-200 transition-all shadow-md shadow-amber-500/15 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Mengirim...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>Kirim Laporan</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer link email langsung */}
        <div className="px-6 py-3 bg-surface-950/90 border-t border-surface-850 flex items-center justify-between text-xs text-surface-400">
          <span>Kendala mendesak?</span>
          <a
            href="mailto:firdausrizki76@gmail.com?subject=Laporan%20Bug%20AppScript%20Generator"
            className="inline-flex items-center gap-1.5 text-amber-300 hover:text-amber-200 font-medium underline underline-offset-2 transition"
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Email langsung ke firdausrizki76@gmail.com</span>
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function ReportBugButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/20 hover:border-amber-500/40 hover:scale-105 transition-all shadow-sm cursor-pointer ml-1"
        title="Laporkan Bug ke Developer"
      >
        <Bug className="h-3.5 w-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
        <span className="hidden sm:inline">Lapor Bug</span>
      </button>

      <ReportBugModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
