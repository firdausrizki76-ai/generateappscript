"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getProfile,
  getDefaultWizardData,
  generateId,
  addPromptToHistory,
  isLoggedIn,
  type InterviewData,
  type UserProfile,
} from "@/lib/store";
import { supabase } from "@/lib/supabase";
import InterviewWizard from "@/components/interview-wizard";

export default function GeneratePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setMounted(true);
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    const fetchProfile = async () => {
      const prof = await getProfile();
      setProfile(prof);
    };
    fetchProfile();
  }, [router]);

  const handleInterviewComplete = async (interviewData: InterviewData) => {
    try {
      const prof = profile || (await getProfile());

      // Check quota
      if (prof.quotaUsed >= prof.quotaLimit) {
        setShowQuotaModal(true);
        return;
      }

      setGenerating(true);
      setErrorMsg("");

      // Get auth token
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");
      }

      // Call AI PRD Generation API
      const res = await fetch("/api/generate-prd", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ interviewData }),
      });

      const data = await res.json();

      if (!data.success) {
        if (res.status === 403) {
          setShowQuotaModal(true);
          setGenerating(false);
          return;
        }
        throw new Error(data.error || "Gagal menghasilkan PRD.");
      }

      const prdMarkdown = data.prdMarkdown;

      // Build a minimal WizardData for backward compatibility
      const wizardData = {
        ...getDefaultWizardData(),
        appName: interviewData.appName,
        appDescription: interviewData.appDescription,
        hasLogin: true,
        loginAccess: interviewData.targetUserRoles.map((r) => r.roleName).join(", "),
      };

      // Save to history
      const id = generateId();
      await addPromptToHistory({
        id,
        appName: interviewData.appName,
        description: interviewData.appDescription,
        createdAt: new Date().toISOString(),
        outputMd: prdMarkdown,
        inputData: wizardData,
        interviewData: interviewData,
        isAiGeneratedPrd: true,
        codeGs: "",
        codeHtml: "",
        chatHistory: [],
      });

      router.push(`/result/${id}`);
    } catch (err: any) {
      console.error("Error generating PRD:", err);
      setErrorMsg(err.message || "Terjadi kesalahan saat menghasilkan PRD. Silakan coba lagi.");
      setGenerating(false);
    }
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-70px)] flex flex-col overflow-hidden bg-surface-950">
      {/* Interview Wizard */}
      <InterviewWizard onComplete={handleInterviewComplete} generating={generating} />

      {/* Error Toast */}
      {errorMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-lg w-full px-4">
          <div className="bg-red-500/10 border border-red-500/30 backdrop-blur-xl rounded-2xl px-5 py-4 flex items-start gap-3 shadow-2xl animate-fade-up">
            <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-red-400 text-sm">✕</span>
            </div>
            <div className="flex-1">
              <p className="text-sm text-red-200 font-medium">{errorMsg}</p>
            </div>
            <button
              onClick={() => setErrorMsg("")}
              className="text-surface-400 hover:text-white transition-colors shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Quota Modal */}
      {showQuotaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-3xl p-8 max-w-md w-full mx-4 text-center space-y-6 animate-fade-up">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/15 flex items-center justify-center">
              <span className="text-3xl">⚡</span>
            </div>
            <div>
              <h3 className="text-xl font-bold font-display text-white mb-2">Kuota Habis</h3>
              <p className="text-surface-400 text-sm leading-relaxed">
                Kuota generate bulanan Anda telah terpakai ({profile?.quotaUsed}/{profile?.quotaLimit}).
                Upgrade ke <span className="text-brand-400 font-semibold">Pro Plan</span> untuk mendapatkan kuota lebih banyak dan fitur premium lainnya.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowQuotaModal(false)}
                className="flex-1 btn-ghost text-sm"
              >
                Tutup
              </button>
              <button
                onClick={() => router.push("/account")}
                className="flex-1 btn-primary text-sm"
              >
                Upgrade Pro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
