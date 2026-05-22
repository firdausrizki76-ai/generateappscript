"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Eye,
  Copy,
  Trash2,
  Check,
  AlertTriangle,
  TrendingUp,
  FileText,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  getProfile,
  getHistory,
  deletePrompt,
  isLoggedIn,
  upgradePlan,
  type UserProfile,
  type PromptHistory,
} from "@/lib/store";

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<PromptHistory[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    const loadData = async () => {
      try {
        if (typeof window !== "undefined") {
          const pendingPlan = localStorage.getItem("pending_plan");
          if (pendingPlan) {
            localStorage.removeItem("pending_plan");
            if (pendingPlan === "pro") {
              await upgradePlan("pro");
            }
          }
        }
        const prof = await getProfile();
        setProfile(prof);
        const hist = await getHistory();
        setHistory(hist);
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      }
    };
    loadData();
  }, [router]);

  const handleCopy = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDelete = async (id: string) => {
    await deletePrompt(id);
    const hist = await getHistory();
    setHistory(hist);
    setDeleteId(null);
  };

  if (!mounted || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const quotaLeft = Math.max(0, profile.quotaLimit - profile.quotaUsed);
  const quotaPercent = (profile.quotaUsed / profile.quotaLimit) * 100;

  return (
    <div className="relative min-h-[80vh] py-10">
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      <div className="absolute inset-0 bg-radial-top pointer-events-none" />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Dashboard</h1>
            <p className="text-surface-400 text-sm">
              Selamat datang, <span className="text-brand-300 font-medium">{profile.name}</span>
            </p>
          </div>
          <Link href="/generate" className="btn-primary flex items-center gap-2 text-sm animate-pulse-glow">
            <Sparkles className="h-4 w-4" /> Buat Prompt Baru
          </Link>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {/* Quota Card */}
          <div className="glass rounded-2xl p-6 col-span-1 sm:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-surface-400">Kuota Prompt Bulan Ini</span>
              <span className="text-xs text-surface-500 uppercase font-semibold tracking-wide px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-300">
                {profile.plan}
              </span>
            </div>
            <div className="flex items-end gap-2 mb-3">
              <span className="text-4xl font-extrabold text-white">{quotaLeft}</span>
              <span className="text-surface-500 text-sm mb-1">/ {profile.quotaLimit} tersisa</span>
            </div>
            {/* Progress Bar */}
            <div className="h-2 rounded-full bg-surface-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  quotaPercent >= 80 ? "bg-red-500" : quotaPercent >= 50 ? "bg-yellow-500" : "bg-brand-500"
                }`}
                style={{ width: `${quotaPercent}%` }}
              />
            </div>
            <p className="text-xs text-surface-500 mt-2">
              {profile.quotaUsed} dari {profile.quotaLimit} kuota sudah terpakai
            </p>
          </div>
          {/* Quick Stat */}
          <div className="glass rounded-2xl p-6 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-9 w-9 rounded-lg bg-brand-600/20 flex items-center justify-center">
                <FileText className="h-5 w-5 text-brand-400" />
              </div>
              <span className="text-sm text-surface-400">Total Prompt</span>
            </div>
            <span className="text-4xl font-extrabold text-white">{history.length}</span>
          </div>
        </div>

        {/* Upgrade Banner */}
        {(quotaLeft <= 2 && profile.plan !== "business") && (
          <div className="glass rounded-2xl p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 border border-yellow-500/20 animate-fade-up">
            <div className="flex items-center gap-3 flex-1">
              <div className="h-10 w-10 rounded-xl bg-yellow-500/20 flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {quotaLeft === 0 ? "Kuota habis!" : `Kuota tersisa ${quotaLeft}!`}
                </p>
                <p className="text-xs text-surface-400">
                  Upgrade paket untuk mendapatkan lebih banyak kuota generate prompt.
                </p>
              </div>
            </div>
            <Link href="/account" className="btn-primary text-sm !py-2 shrink-0">
              Upgrade Sekarang
            </Link>
          </div>
        )}

        {/* History */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Riwayat Prompt</h2>
          {history.length === 0 ? (
            <div className="glass-light rounded-2xl p-12 text-center">
              <div className="flex justify-center mb-4">
                <FileText className="h-16 w-16 text-surface-600" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Belum Ada Prompt</h3>
              <p className="text-sm text-surface-400 mb-6">
                Mulai buat prompt pertama Anda dengan wizard generator.
              </p>
              <Link href="/generate" className="btn-primary inline-flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4" /> Buat Prompt Pertama
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="glass-light rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 card-hover"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{item.appName}</h3>
                    <p className="text-xs text-surface-400 mt-0.5 line-clamp-1">{item.description}</p>
                    <p className="text-xs text-surface-500 mt-1">
                      {new Date(item.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/result/${item.id}`}
                      className="btn-ghost !py-2 !px-3 flex items-center gap-1.5 text-xs"
                    >
                      <Eye className="h-3.5 w-3.5" /> Lihat
                    </Link>
                    <button
                      onClick={() => handleCopy(item.id, item.outputMd)}
                      className="btn-ghost !py-2 !px-3 flex items-center gap-1.5 text-xs"
                    >
                      {copied === item.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-green-400" /> Tersalin
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" /> Copy
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setDeleteId(item.id)}
                      className="btn-ghost !py-2 !px-3 flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 !border-red-500/20 hover:!bg-red-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl p-8 max-w-sm w-full mx-4 animate-fade-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Hapus Prompt?</h3>
            </div>
            <p className="text-sm text-surface-400 mb-6">
              Prompt ini akan dihapus permanen dan tidak bisa dikembalikan.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="btn-ghost flex-1">
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
