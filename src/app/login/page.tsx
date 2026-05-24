"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, ArrowRight, Sparkles, AlertCircle, Eye, EyeOff } from "lucide-react";
import { loginWithEmail, signUpWithEmail, isLoggedIn, loginWithGoogle } from "@/lib/store";
import { AppsScriptLogo } from "@/components/logo";

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"free" | "pro">("free");

  useEffect(() => {
    setMounted(true);
    if (isLoggedIn()) {
      router.push("/dashboard");
    }
  }, [router]);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      if (typeof window !== "undefined") {
        if (activeTab === "register") {
          localStorage.setItem("pending_plan", selectedPlan);
        } else {
          localStorage.removeItem("pending_plan");
        }
      }
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message || "Gagal masuk menggunakan Google.");
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Semua bidang harus diisi.");
      return;
    }

    if (password.length < 6) {
      setError("Kata sandi harus minimal 6 karakter.");
      return;
    }

    if (activeTab === "register" && !name.trim()) {
      setError("Nama lengkap wajib diisi.");
      return;
    }

    setLoading(true);

    try {
      if (activeTab === "login") {
        await loginWithEmail(email.trim(), password);
      } else {
        await signUpWithEmail(email.trim(), password, name.trim(), selectedPlan);
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Gagal masuk. Silakan coba lagi.");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[85vh] py-16 flex items-center justify-center">
      {/* Background Decorator */}
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      <div className="absolute inset-0 bg-radial-top pointer-events-none" />

      <div className="relative w-full max-w-md px-4 animate-fade-up">
        {/* Header / Brand */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-900 border border-brand-500/20 shadow-lg shadow-brand-500/10 mb-5 animate-pulse-glow">
            <AppsScriptLogo className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-black text-white font-display mb-2">
            Selamat Datang Kembali
          </h1>
          <p className="text-surface-400 text-sm">
            Masuk untuk mulai men-generate prompt Apps Script presisi tinggi
          </p>
        </div>

        {/* Auth Card */}
        <div className="glass border border-surface-800 rounded-3xl overflow-hidden shadow-2xl">
          {/* Tab Selector */}
          <div className="flex border-b border-surface-800 bg-surface-900/40">
            <button
              onClick={() => {
                setActiveTab("login");
                setError(null);
              }}
              className={`flex-1 py-4 text-sm font-bold font-display border-b-2 transition cursor-pointer ${
                activeTab === "login"
                  ? "border-brand-500 text-brand-400 bg-surface-800/20"
                  : "border-transparent text-surface-400 hover:text-surface-200"
              }`}
            >
              Masuk Akun
            </button>
            <button
              onClick={() => {
                setActiveTab("register");
                setError(null);
              }}
              className={`flex-1 py-4 text-sm font-bold font-display border-b-2 transition cursor-pointer ${
                activeTab === "register"
                  ? "border-brand-500 text-brand-400 bg-surface-800/20"
                  : "border-transparent text-surface-400 hover:text-surface-200"
              }`}
            >
              Daftar Baru
            </button>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2.5 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm leading-relaxed animate-fade-up">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {activeTab === "register" && (
                <>
                  {/* Plan Selector */}
                  <div className="space-y-3 animate-fade-up">
                    <label className="text-sm font-semibold text-surface-300 block mb-1">
                      Pilih Paket Akun
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedPlan("free")}
                        className={`flex flex-col items-start p-4 rounded-2xl text-left border transition cursor-pointer relative overflow-hidden ${
                          selectedPlan === "free"
                            ? "bg-surface-800/40 border-brand-500/60 shadow-lg shadow-brand-500/5 ring-1 ring-brand-500/30"
                            : "bg-surface-900/40 border-surface-800 hover:border-surface-700 text-surface-400 hover:text-surface-200"
                        }`}
                      >
                        <span className="text-sm font-bold text-white mb-1">Paket FREE</span>
                        <span className="text-[10px] text-surface-400 leading-tight">
                          • 1 prompt / bulan
                          <br />
                          • Tanpa AI Chat helper
                        </span>
                        {selectedPlan === "free" && (
                          <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-brand-500 animate-ping" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedPlan("pro")}
                        className={`flex flex-col items-start p-4 rounded-2xl text-left border transition cursor-pointer relative overflow-hidden ${
                          selectedPlan === "pro"
                            ? "bg-brand-500/10 border-brand-500 shadow-lg shadow-brand-500/10 ring-1 ring-brand-500/40"
                            : "bg-surface-900/40 border-surface-800 hover:border-surface-700 text-surface-400 hover:text-surface-200"
                        }`}
                      >
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-sm font-bold text-white">Paket PRO</span>
                          <Sparkles className="h-3 w-3 text-brand-400" />
                        </div>
                        <span className="text-[10px] text-brand-300 font-semibold mb-0.5">IDR 150K / bulan</span>
                        <span className="text-[10px] text-surface-400 leading-tight">
                          • 10 prompt / bulan
                          <br />
                          • 50 AI Chat helper
                        </span>
                        {selectedPlan === "pro" && (
                          <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-brand-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 animate-fade-up">
                    <label className="text-sm font-semibold text-surface-300">
                      Nama Lengkap
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Masukkan nama lengkap Anda"
                      className="input-premium w-full text-sm py-3 px-4"
                      disabled={loading}
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <label className="text-sm font-semibold text-surface-300">
                  Alamat Email
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-surface-500 pointer-events-none">
                    <Mail className="h-5 w-5" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@contoh.com"
                    className="input-premium w-full pl-12 py-3 pr-4 text-sm"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-surface-300">
                    Kata Sandi
                  </label>
                  {activeTab === "login" && (
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        alert("Simulasi lupa kata sandi. Silakan gunakan fitur Masuk Instan.");
                      }}
                      className="text-xs text-brand-400 hover:text-brand-300 font-medium transition"
                    >
                      Lupa kata sandi?
                    </a>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-surface-500 pointer-events-none">
                    <Lock className="h-5 w-5" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi Anda"
                    className="input-premium w-full pl-12 pr-12 py-3 text-sm"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-surface-500 hover:text-surface-300 transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary flex items-center justify-center gap-2 text-sm font-bold py-3.5 mt-6 cursor-pointer shadow-lg shadow-brand-500/10"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <span>{activeTab === "login" ? "Masuk Sekarang" : "Daftar Akun Baru"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="relative flex items-center justify-center my-5">
              <div className="absolute inset-x-0 h-px bg-surface-800" />
              <span className="relative bg-surface-900/60 px-4 text-xs text-surface-500 uppercase tracking-wider font-semibold">
                Atau Masuk Dengan
              </span>
            </div>

            {/* Google Sign-in */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-surface-900 hover:bg-surface-800/80 border border-surface-800 hover:border-surface-700 text-white rounded-2xl py-3.5 px-4 transition cursor-pointer font-semibold text-sm shadow-md"
            >
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
              <span>Masuk dengan Google</span>
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}
