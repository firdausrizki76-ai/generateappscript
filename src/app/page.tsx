"use client";

import Link from "next/link";
import {
  Sparkles,
  Zap,
  FileCode2,
  Shield,
  ArrowRight,
  Check,
  Star,
  Code2,
  Database,
  Layout,
} from "lucide-react";

/* ─── Feature data ─── */
const features = [
  {
    icon: FileCode2,
    title: "Prompt Presisi Tinggi",
    desc: "Hasilkan prompt yang sangat detail sehingga AI tidak perlu menebak. Setiap field, validasi, dan operasi CRUD terdefinisi jelas.",
  },
  {
    icon: Shield,
    title: "Anti-Error Output",
    desc: "Checklist otomatis memastikan nama Sheet, index kolom, dan handler selalu konsisten. Kode langsung jalan tanpa debug.",
  },
  {
    icon: Zap,
    title: "5 Menit, Langsung Jadi",
    desc: "Wizard 5 langkah yang intuitif. Isi form, generate, paste ke AI — aplikasi Apps Script Anda siap deploy.",
  },
];

/* ─── Pricing data ─── */
const plans = [
  {
    name: "Free",
    price: "Gratis",
    period: "",
    quota: "1 prompt / bulan",
    highlight: false,
    features: [
      "Wizard 5 langkah penuh",
      "Output plan.md lengkap",
      "Copy & download hasil .md",
      "Tanpa kartu kredit",
      "❌ Tanpa Workspace & AI Chatbot",
    ],
  },
  {
    name: "Pro",
    price: "Rp 60.000",
    period: "/ bulan",
    quota: "10 prompt / bulan",
    highlight: true,
    features: [
      "Semua fitur Free",
      "10x generate per bulan",
      "Workspace Kode (code.gs & HTML)",
      "AI Chatbot Modifikasi Kode",
      "50x Chat Revisi / bulan",
      "Riwayat prompt tersimpan",
    ],
  },
  {
    name: "Business",
    price: "Rp 150.000",
    period: "/ bulan",
    quota: "30 prompt / bulan",
    highlight: false,
    features: [
      "Semua fitur Pro",
      "30x generate per bulan",
      "Workspace Kode (code.gs & HTML)",
      "AI Chatbot Modifikasi Kode",
      "150x Chat Revisi / bulan",
      "Cocok untuk tim kecil",
    ],
  },
];

/* ─── Example output preview ─── */
const exampleOutput = `# Sistem Absensi Karyawan — Google Apps Script Implementation Plan

## Overview
Aplikasi web untuk mencatat kehadiran karyawan harian, 
mengelola data karyawan, dan menghasilkan laporan bulanan.

## Google Sheets Structure

### Sheet: \`Sheet_Karyawan\`
| Kolom       | Tipe    | Wajib | Keterangan       |
|-------------|---------|-------|------------------|
| id          | UUID    | Ya    | Auto-generate    |
| nama        | String  | Ya    | Nama lengkap     |
| departemen  | String  | Ya    | Pilihan dropdown |
| email       | String  | Ya    | Email kantor     |

## Menu & Features
### Menu: 📋 Data Karyawan
- ✅ CREATE: Form input + validasi
- ✅ READ: Tabel + search + pagination
- ✅ UPDATE: Modal edit + pre-fill
- ✅ DELETE: Konfirmasi dialog`;

export default function LandingPage() {
  return (
    <div className="relative">
      {/* ═══ Background decorations ═══ */}
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      <div className="absolute inset-0 bg-radial-top pointer-events-none" />

      {/* ═══ HERO ═══ */}
      <section className="relative pt-20 pb-24 sm:pt-28 sm:pb-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-600/15 border border-brand-500/20 text-brand-300 text-sm font-medium mb-6 animate-fade-up">
            <Sparkles className="h-4 w-4" />
            Generator Prompt Apps Script #1 di Indonesia
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mb-6 animate-fade-up"
              style={{ animationDelay: "0.1s" }}>
            Buat Aplikasi{" "}
            <span className="gradient-text">Google Apps Script</span>
            <br />
            dalam Hitungan Menit
          </h1>

          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-surface-400 leading-relaxed mb-10 animate-fade-up"
             style={{ animationDelay: "0.2s" }}>
            Generate prompt terstruktur yang menghasilkan{" "}
            <code className="text-brand-300 bg-brand-600/15 px-1.5 py-0.5 rounded text-base">code.gs</code> +{" "}
            <code className="text-brand-300 bg-brand-600/15 px-1.5 py-0.5 rounded text-base">index.html</code>{" "}
            fungsional, anti-error, dan lengkap dengan CRUD.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up"
               style={{ animationDelay: "0.3s" }}>
            <Link
              href="/generate"
              className="btn-primary text-base flex items-center gap-2 !px-7 !py-3.5 animate-pulse-glow"
            >
              <Sparkles className="h-5 w-5" />
              Buat Apps Script Sekarang
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="#pricing" className="btn-ghost text-base flex items-center gap-2 !px-6 !py-3">
              Lihat Paket Harga
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto animate-fade-up"
               style={{ animationDelay: "0.4s" }}>
            {[
              { val: "500+", label: "Prompt dibuat" },
              { val: "5 min", label: "Waktu rata-rata" },
              { val: "99%", label: "Akurasi output" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold gradient-text">{s.val}</div>
                <div className="text-xs sm:text-sm text-surface-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section className="relative py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Kenapa <span className="gradient-text">AppScript Generator</span>?
            </h2>
            <p className="text-surface-400 max-w-xl mx-auto">
              Buat prompt sekali, hasilkan aplikasi Apps Script yang langsung
              bisa di-deploy tanpa error.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="glass rounded-2xl p-8 card-hover"
                  style={{ animationDelay: `${i * 0.15}s` }}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-brand mb-5 shadow-lg shadow-brand-500/20">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-surface-400 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="relative py-20 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Cara Kerja — <span className="gradient-text">3 Langkah Mudah</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", icon: Layout, title: "Isi Wizard Form", desc: "Tentukan nama aplikasi, menu, struktur data, dan preferensi tampilan melalui wizard 5 langkah yang intuitif." },
              { step: "02", icon: Code2, title: "Generate Prompt", desc: "Sistem menghasilkan plan.md terstruktur yang berisi semua spesifikasi teknis untuk Google Apps Script." },
              { step: "03", icon: Database, title: "Paste ke AI & Deploy", desc: "Copy plan.md, paste ke ChatGPT/Gemini/Claude, dapatkan kode siap pakai, deploy di Google Apps Script." },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="relative text-center">
                  <div className="text-6xl font-black text-brand-500/10 mb-4 select-none">{s.step}</div>
                  <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-xl glass-light mb-4">
                    <Icon className="h-7 w-7 text-brand-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{s.title}</h3>
                  <p className="text-sm text-surface-400 leading-relaxed">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ EXAMPLE OUTPUT ═══ */}
      <section className="relative py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Contoh <span className="gradient-text">Output plan.md</span>
            </h2>
            <p className="text-surface-400 max-w-xl mx-auto">
              Inilah format prompt terstruktur yang dihasilkan — tinggal paste ke
              AI dan dapatkan kode siap deploy.
            </p>
          </div>

          <div className="max-w-3xl mx-auto glass rounded-2xl p-6 sm:p-8 overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-3 w-3 rounded-full bg-red-500/70" />
              <div className="h-3 w-3 rounded-full bg-yellow-500/70" />
              <div className="h-3 w-3 rounded-full bg-green-500/70" />
              <span className="ml-3 text-xs text-surface-500 font-mono">plan.md</span>
            </div>
            <pre className="text-sm text-surface-300 leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto">
              {exampleOutput}
            </pre>
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section id="pricing" className="relative py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Paket <span className="gradient-text">Harga Terjangkau</span>
            </h2>
            <p className="text-surface-400 max-w-xl mx-auto">
              Mulai gratis, upgrade kapan saja. Kuota direset setiap tanggal 1.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((p, i) => (
              <div
                key={i}
                className={`relative rounded-2xl p-8 card-hover ${
                  p.highlight
                    ? "gradient-border glass glow"
                    : "glass-light"
                }`}
              >
                {p.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-semibold gradient-brand text-white shadow-lg">
                    <Star className="h-3 w-3 inline mr-1" />
                    Populer
                  </div>
                )}
                <h3 className="text-xl font-bold text-white mb-1">{p.name}</h3>
                <p className="text-surface-400 text-sm mb-4">{p.quota}</p>
                <div className="mb-6">
                  <span className="text-3xl font-extrabold text-white">{p.price}</span>
                  {p.period && (
                    <span className="text-surface-400 text-sm ml-1">{p.period}</span>
                  )}
                </div>
                <ul className="space-y-3 mb-8">
                  {p.features.map((f, fi) => (
                    <li key={fi} className="flex items-start gap-2 text-sm text-surface-300">
                      <Check className="h-4 w-4 text-brand-400 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={p.highlight ? "/generate" : "/account"}
                  className={`block text-center rounded-xl py-3 font-semibold text-sm transition-all ${
                    p.highlight
                      ? "btn-primary w-full !block text-center"
                      : "btn-ghost w-full"
                  }`}
                >
                  {p.highlight ? "Mulai Sekarang" : "Pilih Paket"}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="relative py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="glass rounded-3xl p-10 sm:p-14 glow">
            <Sparkles className="h-10 w-10 text-brand-400 mx-auto mb-5" />
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Siap Membuat Aplikasi <span className="gradient-text">Apps Script</span>?
            </h2>
            <p className="text-surface-400 mb-8 max-w-lg mx-auto">
              Mulai gratis sekarang — tidak perlu kartu kredit. Buat prompt pertama
              Anda dalam 5 menit.
            </p>
            <Link
              href="/generate"
              className="btn-primary inline-flex items-center gap-2 text-base !px-8 !py-3.5"
            >
              <Sparkles className="h-5 w-5" />
              Buat Prompt Pertama Anda
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
