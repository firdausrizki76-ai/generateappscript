"use client";

import { useEffect, useState } from "react";
import {
  Crown,
  Check,
  Star,
  Zap,
  ArrowRight,
  CreditCard,
  Calendar,
  RefreshCw,
  MessageSquare,
  LogOut,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  getProfile,
  upgradePlan,
  isLoggedIn,
  logout,
  type UserProfile,
} from "@/lib/store";
import { supabase } from "@/lib/supabase";

const plans = [
  {
    key: "free" as const,
    name: "Free",
    price: "Gratis",
    period: "",
    quota: 1,
    features: [
      "1 prompt per bulan",
      "Wizard 5 langkah penuh",
      "Output plan.md lengkap",
      "Copy & download hasil",
      "❌ Tanpa Workspace & AI Chatbot",
    ],
  },
  {
    key: "pro" as const,
    name: "Pro",
    price: "Rp 60.000",
    period: "/ bulan",
    quota: 10,
    popular: true,
    features: [
      "10 prompt per bulan",
      "Workspace Kode (code.gs & HTML)",
      "50x Chat Revisi Kode / bulan",
      "Semua fitur Free",
      "Prioritas support",
    ],
  },
  {
    key: "business" as const,
    name: "Business",
    price: "Rp 150.000",
    period: "/ bulan",
    quota: 30,
    features: [
      "30 prompt per bulan",
      "Workspace Kode (code.gs & HTML)",
      "150x Chat Revisi Kode / bulan",
      "Semua fitur Pro",
      "Cocok untuk tim kecil",
    ],
  },
];

export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [mounted, setMounted] = useState(false);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);

  const fetchInvoices = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setInvoices(data);
      }
    } catch (err) {
      console.error("Error fetching invoices:", err);
    } finally {
      setLoadingInvoices(false);
    }
  };

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
    fetchInvoices();
  }, [router]);

  const handleUpgrade = async (plan: "free" | "pro" | "business") => {
    if (plan === "free") {
      setUpgrading("free");
      try {
        await upgradePlan("free");
        const prof = await getProfile();
        setProfile(prof);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        fetchInvoices();
      } catch (err) {
        console.error("Error downgrading:", err);
      } finally {
        setUpgrading(null);
      }
      return;
    }

    setUpgrading(plan);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        alert("Sesi Anda telah berakhir. Silakan masuk kembali.");
        router.push("/login");
        return;
      }

      // Call API to create Midtrans Snap transaction token
      const res = await fetch("/api/subscription/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal membuat transaksi");
      }

      const snapToken = data.token;
      const snap = (window as any).snap;

      if (snap) {
        snap.pay(snapToken, {
          onSuccess: async function (result: any) {
            setUpgrading(null);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
            
            // Refresh user profile and transactions
            const prof = await getProfile();
            setProfile(prof);
            fetchInvoices();
          },
          onPending: function (result: any) {
            setUpgrading(null);
            alert("Transaksi tertunda. Silakan selesaikan pembayaran sesuai panduan.");
            fetchInvoices();
          },
          onError: function (result: any) {
            setUpgrading(null);
            alert("Transaksi gagal atau dibatalkan.");
            fetchInvoices();
          },
          onClose: function () {
            setUpgrading(null);
          },
        });
      } else {
        // Fallback to redirect URL if snap.js is not loaded
        if (data.redirectUrl) {
          window.location.href = data.redirectUrl;
        } else {
          throw new Error("Sistem pembayaran Midtrans sedang memuat. Silakan coba beberapa saat lagi.");
        }
      }
    } catch (err: any) {
      alert(err.message || "Gagal memproses pembayaran. Hubungi dukungan.");
      setUpgrading(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
    router.refresh();
  };

  if (!mounted || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-[80vh] py-10">
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      <div className="absolute inset-0 bg-radial-top pointer-events-none" />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        <h1 className="text-3xl font-bold text-white mb-8">Akun Saya</h1>

        {/* Success Toast */}
        {showSuccess && (
          <div className="fixed top-20 right-6 z-50 glass rounded-xl p-4 flex items-center gap-3 border border-green-500/20 animate-slide-in shadow-lg">
            <div className="h-8 w-8 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Check className="h-4 w-4 text-green-400" />
            </div>
            <p className="text-sm text-white font-medium">Paket berhasil diperbarui!</p>
          </div>
        )}

        {/* Profile Card */}
        <div className="glass rounded-2xl p-6 sm:p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Avatar */}
              <div className="h-16 w-16 rounded-2xl gradient-brand flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-brand-500/25">
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white">{profile.name}</h2>
                <p className="text-sm text-surface-400">{profile.email}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-brand-600/15 border border-brand-500/20">
                <Crown className="h-4 w-4 text-brand-400" />
                <span className="text-sm font-semibold text-brand-300 capitalize">
                  Paket {profile.plan}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="btn-ghost flex items-center justify-center gap-2 text-xs py-2 px-4 text-red-400 border-red-500/20 hover:bg-red-500/10 hover:border-red-500/35 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Keluar
              </button>
            </div>
          </div>

          {/* Quota info */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="glass-light rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-brand-400" />
                <span className="text-xs text-surface-400">Kuota Prompt</span>
              </div>
              <span className="text-2xl font-bold text-white">
                {Math.max(0, profile.quotaLimit - profile.quotaUsed)}{" "}
                <span className="text-sm text-surface-500 font-normal">/ {profile.quotaLimit}</span>
              </span>
            </div>
            <div className="glass-light rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="h-4 w-4 text-brand-400" />
                <span className="text-xs text-surface-400">Kuota Chat AI</span>
              </div>
              <span className="text-2xl font-bold text-white">
                {Math.max(0, profile.chatQuotaLimit - profile.chatQuotaUsed)}{" "}
                <span className="text-sm text-surface-500 font-normal">/ {profile.chatQuotaLimit}</span>
              </span>
            </div>
            <div className="glass-light rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-brand-400" />
                <span className="text-xs text-surface-400">Reset Kuota</span>
              </div>
              <span className="text-lg font-bold text-white">Tanggal 1</span>
              <p className="text-xs text-surface-500">Setiap bulan</p>
            </div>
            <div className="glass-light rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="h-4 w-4 text-brand-400" />
                <span className="text-xs text-surface-400">Metode Bayar</span>
              </div>
              <span className="text-lg font-bold text-white">
                {profile.plan === "free" ? "-" : "QRIS / VA"}
              </span>
            </div>
          </div>
        </div>

        {/* Plan Selection */}
        <h2 className="text-xl font-bold text-white mb-4">Pilih Paket</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {plans.map((plan) => {
            const isCurrent = profile.plan === plan.key;
            return (
              <div
                key={plan.key}
                className={`relative rounded-2xl p-6 card-hover ${
                  plan.popular
                    ? "gradient-border glass glow"
                    : "glass-light"
                } ${isCurrent ? "ring-2 ring-brand-500/50" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-semibold gradient-brand text-white">
                    <Star className="h-3 w-3 inline mr-1" />
                    Populer
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute top-4 right-4 px-2 py-0.5 rounded-full text-xs font-medium bg-brand-500/20 text-brand-300 border border-brand-500/30">
                    Aktif
                  </div>
                )}
                <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-2xl font-extrabold text-white">{plan.price}</span>
                  {plan.period && (
                    <span className="text-surface-400 text-sm ml-1">{plan.period}</span>
                  )}
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-surface-300">
                      <Check className="h-4 w-4 text-brand-400 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => !isCurrent && handleUpgrade(plan.key)}
                  disabled={isCurrent || upgrading !== null}
                  className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                    isCurrent
                      ? "bg-surface-700/50 text-surface-500 cursor-default"
                      : "btn-primary"
                  } disabled:opacity-50`}
                >
                  {upgrading === plan.key ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Memproses...
                    </>
                  ) : isCurrent ? (
                    "Paket Saat Ini"
                  ) : (
                    <>
                      {plan.key === "free" ? "Downgrade" : "Upgrade"}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Payment History */}
        <h2 className="text-xl font-bold text-white mb-4">Riwayat Pembayaran</h2>
        <div className="glass rounded-2xl overflow-hidden">
          {loadingInvoices ? (
            <div className="p-8 text-center flex justify-center">
              <RefreshCw className="h-5 w-5 text-surface-400 animate-spin" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-surface-400 text-sm">Belum ada riwayat pembayaran.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-700/50">
                    <th className="text-left px-6 py-3 text-surface-400 font-medium">Invoice / Order ID</th>
                    <th className="text-left px-6 py-3 text-surface-400 font-medium">Tanggal</th>
                    <th className="text-left px-6 py-3 text-surface-400 font-medium">Paket</th>
                    <th className="text-left px-6 py-3 text-surface-400 font-medium">Jumlah</th>
                    <th className="text-left px-6 py-3 text-surface-400 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((pay) => {
                    const formattedDate = new Date(pay.created_at).toLocaleDateString("id-ID", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    });
                    const amount = pay.plan === "pro" ? "Rp 60.000" : "Rp 150.000";

                    // Status mapping
                    let statusText = "Menunggu Pembayaran";
                    let statusStyle = "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20";

                    if (pay.status === "active") {
                      statusText = "Lunas / Aktif";
                      statusStyle = "bg-green-500/15 text-green-400 border border-green-500/20";
                    } else if (pay.status === "cancelled") {
                      statusText = "Batal / Expired";
                      statusStyle = "bg-red-500/15 text-red-400 border border-red-500/20";
                    }

                    return (
                      <tr key={pay.id} className="border-b border-surface-800/50 hover:bg-surface-800/30 transition">
                        <td className="px-6 py-3 text-white font-mono text-xs max-w-[200px] truncate" title={pay.midtrans_order_id || pay.id}>
                          {pay.midtrans_order_id || pay.id}
                        </td>
                        <td className="px-6 py-3 text-surface-300 text-xs">{formattedDate}</td>
                        <td className="px-6 py-3 text-surface-300 text-xs capitalize font-semibold">{pay.plan}</td>
                        <td className="px-6 py-3 text-white font-medium text-xs">{amount}</td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle}`}>
                            {statusText}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
