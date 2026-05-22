"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Check,
  AlertTriangle,
  FileText,
  LayoutGrid,
  Database,
  Palette,
  ClipboardList,
  Users,
  BarChart3,
  Package,
  DollarSign,
  Calendar,
  Bell,
  FileEdit,
  Settings,
  Folder,
  TrendingUp,
  Tag,
  Eye,
  RefreshCw,
  Lock,
  Unlock,
  Mail,
} from "lucide-react";
import {
  getProfile,
  getDefaultWizardData,
  generateId,
  addPromptToHistory,
  isLoggedIn,
  type WizardData,
  type MenuItem,
  type SheetDef,
  type ColumnDef,
  type UserProfile,
} from "@/lib/store";
import { buildPrompt } from "@/lib/prompt-builder";

/* ─── Step configuration ─── */
const steps = [
  { label: "Identitas", icon: FileText },
  { label: "Menu & Fitur", icon: LayoutGrid },
  { label: "Struktur Data", icon: Database },
  { label: "Tampilan & UX", icon: Palette },
  { label: "Review", icon: ClipboardList },
];

const dataSourceOptions = [
  "Google Sheets",
  "Google Forms + Sheets",
  "Google Drive",
  "Kombinasi",
];
const userTypeOptions = [
  "Hanya saya sendiri",
  "Tim kecil (< 10 orang)",
  "Banyak pengguna",
];
const menuIconOptions = [
  { name: "ClipboardList", component: ClipboardList, label: "Daftar" },
  { name: "Users", component: Users, label: "Pengguna" },
  { name: "BarChart3", component: BarChart3, label: "Statistik" },
  { name: "Package", component: Package, label: "Produk" },
  { name: "DollarSign", component: DollarSign, label: "Keuangan" },
  { name: "Calendar", component: Calendar, label: "Kalender" },
  { name: "Bell", component: Bell, label: "Notifikasi" },
  { name: "FileEdit", component: FileEdit, label: "Input" },
  { name: "Settings", component: Settings, label: "Pengaturan" },
  { name: "Folder", component: Folder, label: "Berkas" },
  { name: "TrendingUp", component: TrendingUp, label: "Grafik" },
  { name: "Tag", component: Tag, label: "Label" },
];

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  ClipboardList,
  Users,
  BarChart3,
  Package,
  DollarSign,
  Calendar,
  Bell,
  FileEdit,
  Settings,
  Folder,
  TrendingUp,
  Tag,
};

const renderMenuIcon = (iconName: string, className = "h-4 w-4 inline mr-1 text-brand-400") => {
  const IconComp = iconMap[iconName];
  if (IconComp) {
    return <IconComp className={className} />;
  }
  const fallbackEmojis: Record<string, string> = {
    "📋": "ClipboardList",
    "👥": "Users",
    "📊": "BarChart3",
    "📦": "Package",
    "💰": "DollarSign",
    "📅": "Calendar",
    "🔔": "Bell",
    "📝": "FileEdit",
    "⚙️": "Settings",
    "🗂️": "Folder",
    "📈": "TrendingUp",
    "🏷️": "Tag",
  };
  const mappedIcon = fallbackEmojis[iconName];
  if (mappedIcon && iconMap[mappedIcon]) {
    const FallbackIcon = iconMap[mappedIcon];
    return <FallbackIcon className={className} />;
  }
  return <span className="mr-1">{iconName}</span>;
};
const colorPresets = [
  { name: "Biru profesional", color: "#0d6efd" },
  { name: "Hijau segar", color: "#198754" },
  { name: "Ungu modern", color: "#6f42c1" },
  { name: "Abu netral", color: "#6c757d" },
  { name: "Custom hex", color: "" },
];
const tableLayouts = ["Tabel klasik", "Card grid", "Kombinasi"];
const extraFeaturesList = [
  "Dashboard/summary di halaman utama",
  "Grafik/chart dari data",
  "Import data dari CSV",
  "Log aktivitas pengguna",
  "Backup otomatis ke Google Drive",
];
const dataTypes = ["Teks", "Angka", "Tanggal", "Pilihan", "Boolean"];
const exportFormatOptions = ["PDF", "CSV", "Cetak langsung"];

export default function GeneratePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(getDefaultWizardData());
  const [generating, setGenerating] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

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

  /* ─── Helpers ─── */
  const updateData = (partial: Partial<WizardData>) =>
    setData((prev) => ({ ...prev, ...partial }));

  const updateMenu = (idx: number, partial: Partial<MenuItem>) =>
    setData((prev) => {
      const menus = [...prev.menus];
      menus[idx] = { ...menus[idx], ...partial };
      return { ...prev, menus };
    });

  const addMenu = () => {
    if (data.menus.length >= 10) return;
    setData((prev) => ({
      ...prev,
      menus: [
        ...prev.menus,
        {
          name: "",
          icon: "ClipboardList",
          description: "",
          crud: { create: true, read: true, update: true, delete: true },
          hasFilter: false,
          filterColumns: "",
          hasExport: false,
          exportFormats: [],
        },
      ],
    }));
  };

  const removeMenu = (idx: number) => {
    if (data.menus.length <= 1) return;
    setData((prev) => ({
      ...prev,
      menus: prev.menus.filter((_, i) => i !== idx),
    }));
  };

  /* When moving from step 2→3, auto-generate sheets for CRUD menus */
  const syncSheets = () => {
    const crudMenus = data.menus.filter(
      (m) => m.crud.create || m.crud.update || m.crud.delete
    );
    const existing = data.sheets;
    const sheets: SheetDef[] = crudMenus.map((menu) => {
      const found = existing.find((s) => s.menuName === menu.name);
      return (
        found || {
          menuName: menu.name,
          sheetName: `Sheet_${menu.name.replace(/\s+/g, "_")}`,
          columns: [{ name: "", type: "Teks", required: true, note: "" }],
          autoCreatedAt: true,
          autoUpdatedAt: true,
          autoCreatedBy: false,
        }
      );
    });
    updateData({ sheets });
  };

  const updateSheet = (sIdx: number, partial: Partial<SheetDef>) =>
    setData((prev) => {
      const sheets = [...prev.sheets];
      sheets[sIdx] = { ...sheets[sIdx], ...partial };
      return { ...prev, sheets };
    });

  const updateColumn = (sIdx: number, cIdx: number, partial: Partial<ColumnDef>) =>
    setData((prev) => {
      const sheets = [...prev.sheets];
      const columns = [...sheets[sIdx].columns];
      columns[cIdx] = { ...columns[cIdx], ...partial };
      sheets[sIdx] = { ...sheets[sIdx], columns };
      return { ...prev, sheets };
    });

  const addColumn = (sIdx: number) =>
    setData((prev) => {
      const sheets = [...prev.sheets];
      sheets[sIdx] = {
        ...sheets[sIdx],
        columns: [...sheets[sIdx].columns, { name: "", type: "Teks", required: false, note: "" }],
      };
      return { ...prev, sheets };
    });

  const removeColumn = (sIdx: number, cIdx: number) =>
    setData((prev) => {
      const sheets = [...prev.sheets];
      sheets[sIdx] = {
        ...sheets[sIdx],
        columns: sheets[sIdx].columns.filter((_, i) => i !== cIdx),
      };
      return { ...prev, sheets };
    });

  /* ─── Navigation ─── */
  const canNext = () => {
    if (step === 0)
      return data.appName.trim() !== "" && data.appDescription.trim() !== "";
    if (step === 1)
      return data.menus.every((m) => m.name.trim() !== "" && m.description.trim() !== "");
    if (step === 2)
      return data.sheets.every(
        (s) =>
          s.sheetName.trim() !== "" &&
          s.columns.length > 0 &&
          s.columns.every((c) => c.name.trim() !== "")
      );
    return true;
  };

  const goNext = () => {
    if (step === 1) syncSheets();
    setStep((s) => Math.min(s + 1, 4));
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  /* ─── Generate ─── */
  const handleGenerate = async () => {
    try {
      const prof = profile || await getProfile();
      if (prof.quotaUsed >= prof.quotaLimit) {
        setShowQuotaModal(true);
        return;
      }
      setGenerating(true);
      const outputMd = buildPrompt(data);
      const id = generateId();
      await addPromptToHistory({
        id,
        appName: data.appName,
        description: data.appDescription,
        createdAt: new Date().toISOString(),
        outputMd,
        inputData: data,
        codeGs: "",
        codeHtml: "",
        chatHistory: [],
      });
      router.push(`/result/${id}`);
    } catch (err) {
      console.error("Error generating prompt:", err);
      alert("Terjadi kesalahan saat menyimpan prompt. Silakan coba lagi.");
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

  /* ═══════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════ */
  return (
    <div className="relative min-h-[80vh] py-10">
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      <div className="absolute inset-0 bg-radial-top pointer-events-none" />

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6">
        {/* ─── Stepper ─── */}
        <div className="relative flex items-center justify-between max-w-2xl mx-auto mb-12 px-2">
          {/* Connecting Line */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-surface-800 pointer-events-none z-0" />
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-gradient-to-r from-brand-500 to-indigo-500 transition-all duration-500 ease-out pointer-events-none z-0"
            style={{ width: `${(step / (steps.length - 1)) * 100}%` }}
          />
          
          {steps.map((s, i) => {
            const Icon = s.icon;
            const active = i === step;
            const done = i < step;
            return (
              <button
                key={i}
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                className="relative z-10 flex flex-col items-center group focus:outline-none"
              >
                {/* Circle Indicator */}
                <div
                  className={`h-9 w-9 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                    active
                      ? "bg-surface-950 border-brand-500 text-brand-400 shadow-[0_0_15px_rgba(99,102,241,0.5)] scale-110"
                      : done
                      ? "bg-brand-600 border-brand-500 text-white cursor-pointer"
                      : "bg-surface-900 border-surface-800 text-surface-500 cursor-not-allowed"
                  }`}
                >
                  {done ? (
                    <Check className="h-4.5 w-4.5 stroke-[2.5]" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                {/* Label */}
                <span
                  className={`absolute -bottom-6 text-[10px] sm:text-xs font-semibold tracking-wide whitespace-nowrap transition-colors duration-300 font-display ${
                    active
                      ? "text-brand-300"
                      : done
                      ? "text-surface-300"
                      : "text-surface-500"
                  }`}
                >
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* ─── Card ─── */}
        <div className="glass rounded-2xl p-6 sm:p-10 animate-fade-up">
          {/* ═══ STEP 1: Identitas ═══ */}
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1 font-display">Identitas Aplikasi</h2>
                <p className="text-sm text-surface-400">Jelaskan aplikasi Apps Script yang ingin Anda buat.</p>
              </div>
              {/* App Name */}
              <div>
                <label className="block text-sm font-medium text-surface-200 mb-1.5 font-display">
                  Nama Aplikasi <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder='Contoh: "Sistem Absensi Karyawan"'
                  value={data.appName}
                  onChange={(e) => updateData({ appName: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-surface-800/60 border border-surface-700 text-white placeholder-surface-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition input-premium"
                />
              </div>
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-surface-200 mb-1.5 font-display">
                  Deskripsi Singkat <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Jelaskan fungsi utama aplikasi ini dalam 2–3 kalimat. Siapa penggunanya? Data apa yang dikelola?"
                  value={data.appDescription}
                  onChange={(e) => updateData({ appDescription: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-surface-800/60 border border-surface-700 text-white placeholder-surface-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition resize-none input-premium"
                />
              </div>
              {/* Data Source */}
              <div>
                <label className="block text-sm font-medium text-surface-200 mb-1.5 font-display">
                  Sumber Data Utama
                </label>
                <select
                  value={data.dataSource}
                  onChange={(e) => updateData({ dataSource: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-surface-800/60 border border-surface-700 text-white focus:outline-none focus:border-brand-500 transition input-premium"
                >
                  {dataSourceOptions.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
              {/* User Type */}
              <div>
                <label className="block text-sm font-medium text-surface-200 mb-2 font-display">
                  Tipe Pengguna Aplikasi
                </label>
                <div className="flex flex-wrap gap-3">
                  {userTypeOptions.map((o) => (
                    <button
                      key={o}
                      onClick={() => updateData({ userType: o })}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all cursor-pointer ${
                        data.userType === o
                          ? "border-brand-500 bg-brand-600/20 text-brand-300"
                          : "border-surface-700 bg-surface-800/40 text-surface-400 hover:border-surface-600"
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Login/Auth Question */}
              <div className="pt-4 border-t border-surface-800/60 space-y-4">
                <label className="block text-sm font-medium text-surface-200 font-display">
                  Apakah aplikasi memerlukan Halaman Login / Pembatasan Akses?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Card 1: Tidak */}
                  <button
                    type="button"
                    onClick={() => updateData({ hasLogin: false })}
                    className={`flex items-start gap-4 p-5 rounded-2xl border text-left transition-all duration-300 cursor-pointer ${
                      !data.hasLogin
                        ? "border-brand-500 bg-brand-600/10 text-white shadow-lg shadow-brand-500/5 scale-[1.01]"
                        : "border-surface-800 bg-surface-900/40 text-surface-400 hover:border-surface-700 hover:text-surface-200"
                    }`}
                  >
                    <div className={`p-3 rounded-xl shrink-0 ${!data.hasLogin ? "bg-brand-500/20 text-brand-300" : "bg-surface-800 text-surface-500"}`}>
                      <Unlock className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-semibold font-display text-white text-sm">Tidak (Akses Terbuka)</p>
                      <p className="text-xs text-surface-400 mt-1 leading-relaxed">
                        Siapa saja yang memiliki link web app dapat langsung mengakses seluruh fitur.
                      </p>
                    </div>
                  </button>

                  {/* Card 2: Ya */}
                  <button
                    type="button"
                    onClick={() => updateData({ hasLogin: true })}
                    className={`flex items-start gap-4 p-5 rounded-2xl border text-left transition-all duration-300 cursor-pointer ${
                      data.hasLogin
                        ? "border-brand-500 bg-brand-600/10 text-white shadow-lg shadow-brand-500/5 scale-[1.01]"
                        : "border-surface-800 bg-surface-900/40 text-surface-400 hover:border-surface-700 hover:text-surface-200"
                    }`}
                  >
                    <div className={`p-3 rounded-xl shrink-0 ${data.hasLogin ? "bg-brand-500/20 text-brand-300" : "bg-surface-800 text-surface-500"}`}>
                      <Lock className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-semibold font-display text-white text-sm">Ya (Dengan Login)</p>
                      <p className="text-xs text-surface-400 mt-1 leading-relaxed">
                        Membatasi akses. Pengguna harus login menggunakan Google Account untuk menggunakan aplikasi.
                      </p>
                    </div>
                  </button>
                </div>

                {/* Optional Email domain allowed list input */}
                {data.hasLogin && (
                  <div className="pt-2 animate-fade-up space-y-2">
                    <label className="block text-xs font-semibold text-brand-300 uppercase tracking-wide">
                      Email / Domain yang Diizinkan (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: admin@gmail.com, @perusahaan.com (kosongkan untuk mengizinkan semua akun Google)"
                      value={data.loginAccess}
                      onChange={(e) => updateData({ loginAccess: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-surface-800/60 border border-surface-700 text-white placeholder-surface-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition input-premium"
                    />
                    <p className="text-xs text-surface-500 leading-relaxed">
                      Tulis daftar email lengkap atau domain khusus (awali dengan @). Pisahkan beberapa email/domain menggunakan koma. Jika dikosongkan, semua orang yang login dengan akun Google dapat masuk.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ STEP 2: Menu & Fitur ═══ */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Menu & Fitur</h2>
                  <p className="text-sm text-surface-400">Tentukan menu-menu utama aplikasi Anda (min. 1, maks. 10).</p>
                </div>
                <button
                  onClick={addMenu}
                  disabled={data.menus.length >= 10}
                  className="btn-primary !py-2 !px-3 flex items-center gap-1 text-sm disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" /> Tambah
                </button>
              </div>

              {data.menus.map((menu, mi) => (
                <div key={mi} className="glass-light rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-brand-300">
                      Menu #{mi + 1}
                    </span>
                    {data.menus.length > 1 && (
                      <button
                        onClick={() => removeMenu(mi)}
                        className="text-red-400 hover:text-red-300 transition p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {/* Nama & Icon */}
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
                    <div>
                      <label className="block text-xs font-medium text-surface-300 mb-1">
                        Nama Menu <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder='Contoh: "Data Karyawan"'
                        value={menu.name}
                        onChange={(e) => updateMenu(mi, { name: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-lg bg-surface-800/60 border border-surface-700 text-white placeholder-surface-500 focus:outline-none focus:border-brand-500 transition text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-surface-300 mb-1.5">Ikon Menu</label>
                      <div className="flex flex-wrap gap-2">
                        {menuIconOptions.map((item) => {
                          const IconComp = item.component;
                          const isSelected = menu.icon === item.name || 
                            (menu.icon === "📋" && item.name === "ClipboardList") ||
                            (menu.icon === "👥" && item.name === "Users") ||
                            (menu.icon === "📊" && item.name === "BarChart3") ||
                            (menu.icon === "📦" && item.name === "Package") ||
                            (menu.icon === "💰" && item.name === "DollarSign") ||
                            (menu.icon === "📅" && item.name === "Calendar") ||
                            (menu.icon === "🔔" && item.name === "Bell") ||
                            (menu.icon === "📝" && item.name === "FileEdit") ||
                            (menu.icon === "⚙️" && item.name === "Settings") ||
                            (menu.icon === "🗂️" && item.name === "Folder") ||
                            (menu.icon === "📈" && item.name === "TrendingUp") ||
                            (menu.icon === "🏷️" && item.name === "Tag");
                          return (
                            <button
                              key={item.name}
                              type="button"
                              onClick={() => updateMenu(mi, { icon: item.name })}
                              title={item.label}
                              className={`h-10 w-10 rounded-xl flex items-center justify-center transition border cursor-pointer ${
                                isSelected
                                  ? "bg-brand-600/20 border-brand-500 text-brand-300 shadow-md shadow-brand-500/10"
                                  : "bg-surface-800/60 border-surface-700 text-surface-400 hover:text-white hover:bg-surface-700/60 hover:border-surface-600"
                              }`}
                            >
                              <IconComp className="h-5 w-5" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  {/* Deskripsi */}
                  <div>
                    <label className="block text-xs font-medium text-surface-300 mb-1">
                      Deskripsi Fungsi <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Jelaskan apa yang bisa dilakukan pengguna di menu ini."
                      value={menu.description}
                      onChange={(e) => updateMenu(mi, { description: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg bg-surface-800/60 border border-surface-700 text-white placeholder-surface-500 focus:outline-none focus:border-brand-500 transition text-sm resize-none"
                    />
                  </div>
                  {/* CRUD */}
                  <div>
                    <label className="block text-xs font-medium text-surface-300 mb-2">Operasi CRUD</label>
                    <div className="flex flex-wrap gap-2">
                      {(["create", "read", "update", "delete"] as const).map((op) => (
                        <button
                          key={op}
                          onClick={() =>
                            updateMenu(mi, {
                              crud: { ...menu.crud, [op]: !menu.crud[op] },
                            })
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition inline-flex items-center gap-1.5 ${
                            menu.crud[op]
                              ? "border-brand-500 bg-brand-600/20 text-brand-300"
                              : "border-surface-700 text-surface-500 hover:border-surface-600"
                          }`}
                        >
                          {op === "create" && <Plus className="h-3.5 w-3.5" />}
                          {op === "create" && "Create"}
                          {op === "read" && <Eye className="h-3.5 w-3.5" />}
                          {op === "read" && "Read"}
                          {op === "update" && <RefreshCw className="h-3.5 w-3.5" />}
                          {op === "update" && "Update"}
                          {op === "delete" && <Trash2 className="h-3.5 w-3.5" />}
                          {op === "delete" && "Delete"}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Filter & Export */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <button
                          onClick={() => updateMenu(mi, { hasFilter: !menu.hasFilter })}
                          className={`h-5 w-9 rounded-full transition-colors relative ${
                            menu.hasFilter ? "bg-brand-500" : "bg-surface-700"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                              menu.hasFilter ? "translate-x-4" : "translate-x-0.5"
                            }`}
                          />
                        </button>
                        <span className="text-xs text-surface-300">Filter / Pencarian</span>
                      </div>
                      {menu.hasFilter && (
                        <input
                          type="text"
                          placeholder="Filter berdasarkan kolom apa?"
                          value={menu.filterColumns}
                          onChange={(e) => updateMenu(mi, { filterColumns: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-surface-800/60 border border-surface-700 text-white placeholder-surface-500 focus:outline-none focus:border-brand-500 transition text-xs"
                        />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <button
                          onClick={() => updateMenu(mi, { hasExport: !menu.hasExport })}
                          className={`h-5 w-9 rounded-full transition-colors relative ${
                            menu.hasExport ? "bg-brand-500" : "bg-surface-700"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                              menu.hasExport ? "translate-x-4" : "translate-x-0.5"
                            }`}
                          />
                        </button>
                        <span className="text-xs text-surface-300">Export Data</span>
                      </div>
                      {menu.hasExport && (
                        <div className="flex flex-wrap gap-1.5">
                          {exportFormatOptions.map((fmt) => (
                            <button
                              key={fmt}
                              onClick={() => {
                                const fmts = menu.exportFormats.includes(fmt)
                                  ? menu.exportFormats.filter((f) => f !== fmt)
                                  : [...menu.exportFormats, fmt];
                                updateMenu(mi, { exportFormats: fmts });
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs border transition ${
                                menu.exportFormats.includes(fmt)
                                  ? "border-brand-500 bg-brand-600/20 text-brand-300"
                                  : "border-surface-700 text-surface-500"
                              }`}
                            >
                              {fmt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══ STEP 3: Struktur Data ═══ */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Struktur Data</h2>
                <p className="text-sm text-surface-400">Definisikan kolom-kolom data untuk setiap sheet/tabel. Kolom ID akan otomatis ditambahkan.</p>
              </div>

              {data.sheets.map((sheet, si) => (
                <div key={si} className="glass-light rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-brand-300 flex items-center gap-1.5">
                      {(() => {
                        const associatedMenu = data.menus.find((m) => m.name === sheet.menuName);
                        const iconName = associatedMenu ? associatedMenu.icon : "Database";
                        return renderMenuIcon(iconName, "h-4 w-4 text-brand-400 shrink-0");
                      })()}
                      {sheet.menuName}
                    </span>
                  </div>
                  {/* Sheet Name */}
                  <div>
                    <label className="block text-xs font-medium text-surface-300 mb-1">
                      Nama Sheet <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={sheet.sheetName}
                      onChange={(e) => updateSheet(si, { sheetName: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg bg-surface-800/60 border border-surface-700 text-white focus:outline-none focus:border-brand-500 transition text-sm"
                    />
                  </div>
                  {/* Columns */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-surface-300">Kolom Data</label>
                      <button onClick={() => addColumn(si)} className="text-brand-400 hover:text-brand-300 text-xs flex items-center gap-1">
                        <Plus className="h-3 w-3" /> Tambah kolom
                      </button>
                    </div>
                    <div className="space-y-4 md:space-y-2">
                      {sheet.columns.map((col, ci) => (
                        <div
                          key={ci}
                          className="flex flex-col md:grid md:grid-cols-[1.5fr_1.2fr_auto_2fr_auto] gap-2 items-stretch md:items-center border-b border-surface-800/60 md:border-b-0 pb-4 md:pb-0"
                        >
                          <input
                            type="text"
                            placeholder="Nama kolom"
                            value={col.name}
                            onChange={(e) => updateColumn(si, ci, { name: e.target.value })}
                            className="px-3 py-2 rounded-lg bg-surface-800/60 border border-surface-700 text-white placeholder-surface-500 focus:outline-none focus:border-brand-500 transition text-xs"
                          />
                          <select
                            value={col.type}
                            onChange={(e) => updateColumn(si, ci, { type: e.target.value })}
                            className="px-2 py-2 rounded-lg bg-surface-800/60 border border-surface-700 text-white focus:outline-none focus:border-brand-500 transition text-xs"
                          >
                            {dataTypes.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => updateColumn(si, ci, { required: !col.required })}
                            title="Wajib diisi?"
                            className={`px-3 py-2 rounded-lg text-xs border transition cursor-pointer ${
                              col.required
                                ? "border-brand-500 bg-brand-600/20 text-brand-300"
                                : "border-surface-700 text-surface-500 hover:border-surface-600"
                            }`}
                          >
                            Wajib
                          </button>
                          <input
                            type="text"
                            placeholder="Catatan (opsional)"
                            value={col.note}
                            onChange={(e) => updateColumn(si, ci, { note: e.target.value })}
                            className="px-3 py-2 rounded-lg bg-surface-800/60 border border-surface-700 text-white placeholder-surface-500 focus:outline-none focus:border-brand-500 transition text-xs w-full md:w-auto"
                          />
                          {sheet.columns.length > 1 && (
                            <button
                              onClick={() => removeColumn(si, ci)}
                              className="text-red-400 hover:text-red-300 p-2 md:p-1 flex items-center justify-center gap-1.5 border border-red-500/10 md:border-0 rounded-lg hover:bg-red-500/10 md:hover:bg-transparent text-xs md:text-inherit mt-1 md:mt-0 transition"
                            >
                              <Trash2 className="h-4 w-4 md:h-3.5 md:w-3.5" />
                              <span className="md:hidden">Hapus Kolom</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Auto columns */}
                  <div>
                    <label className="block text-xs font-medium text-surface-300 mb-2">Kolom Otomatis</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { key: "autoCreatedAt" as const, label: "createdAt" },
                        { key: "autoUpdatedAt" as const, label: "updatedAt" },
                        { key: "autoCreatedBy" as const, label: "createdBy (email)" },
                      ].map((opt) => (
                        <button
                          key={opt.key}
                          onClick={() => updateSheet(si, { [opt.key]: !sheet[opt.key] })}
                          className={`px-3 py-1.5 rounded-lg text-xs border transition inline-flex items-center gap-1.5 ${
                            sheet[opt.key]
                              ? "border-brand-500 bg-brand-600/20 text-brand-300"
                              : "border-surface-700 text-surface-500 hover:border-surface-600"
                          }`}
                        >
                          {sheet[opt.key] ? (
                            <Check className="h-3.5 w-3.5 text-brand-400" />
                          ) : (
                            <span className="h-3 w-3 border border-surface-600 rounded-sm" />
                          )}
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══ STEP 4: Tampilan & UX ═══ */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Tampilan & UX</h2>
                <p className="text-sm text-surface-400">Atur preferensi visual dan fitur tambahan untuk aplikasi.</p>
              </div>
              {/* Color Theme */}
              <div>
                <label className="block text-sm font-medium text-surface-200 mb-2">Tema Warna</label>
                <div className="flex flex-wrap gap-3">
                  {colorPresets.map((cp) => (
                    <button
                      key={cp.name}
                      onClick={() => updateData({ colorTheme: cp.name, customColor: cp.color || data.customColor })}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border transition ${
                        data.colorTheme === cp.name
                          ? "border-brand-500 bg-brand-600/20 text-brand-300"
                          : "border-surface-700 bg-surface-800/40 text-surface-400 hover:border-surface-600"
                      }`}
                    >
                      {cp.color && (
                        <span className="h-4 w-4 rounded-full border border-white/20" style={{ background: cp.color }} />
                      )}
                      {cp.name}
                    </button>
                  ))}
                </div>
                {data.colorTheme === "Custom hex" && (
                  <input
                    type="text"
                    placeholder="#6366f1"
                    value={data.customColor}
                    onChange={(e) => updateData({ customColor: e.target.value })}
                    className="mt-3 px-4 py-2.5 rounded-xl bg-surface-800/60 border border-surface-700 text-white placeholder-surface-500 focus:outline-none focus:border-brand-500 transition text-sm w-40"
                  />
                )}
              </div>
              {/* Table Layout */}
              <div>
                <label className="block text-sm font-medium text-surface-200 mb-2">Tampilan Tabel Data</label>
                <div className="flex flex-wrap gap-3">
                  {tableLayouts.map((tl) => (
                    <button
                      key={tl}
                      onClick={() => updateData({ tableLayout: tl })}
                      className={`px-4 py-2.5 rounded-xl text-sm border transition ${
                        data.tableLayout === tl
                          ? "border-brand-500 bg-brand-600/20 text-brand-300"
                          : "border-surface-700 bg-surface-800/40 text-surface-400 hover:border-surface-600"
                      }`}
                    >
                      {tl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Email Notif */}
              <div className="glass-light rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => updateData({ hasEmailNotif: !data.hasEmailNotif })}
                    className={`h-5 w-9 rounded-full transition-colors relative ${
                      data.hasEmailNotif ? "bg-brand-500" : "bg-surface-700"
                    }`}
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${data.hasEmailNotif ? "translate-x-4" : "translate-x-0.5"}`} />
                  </button>
                  <span className="text-sm text-surface-200">Notifikasi Email</span>
                </div>
                {data.hasEmailNotif && (
                  <input
                    type="text"
                    placeholder="Event apa yang trigger notifikasi?"
                    value={data.emailTrigger}
                    onChange={(e) => updateData({ emailTrigger: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg bg-surface-800/60 border border-surface-700 text-white placeholder-surface-500 focus:outline-none focus:border-brand-500 transition text-sm"
                  />
                )}
              </div>
              {/* Extra Features */}
              <div>
                <label className="block text-sm font-medium text-surface-200 mb-2">Fitur Tambahan</label>
                <div className="space-y-2">
                  {extraFeaturesList.map((feat) => (
                    <button
                      key={feat}
                      onClick={() => {
                        const ef = data.extraFeatures.includes(feat)
                          ? data.extraFeatures.filter((f) => f !== feat)
                          : [...data.extraFeatures, feat];
                        updateData({ extraFeatures: ef });
                      }}
                      className={`flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm text-left border transition ${
                        data.extraFeatures.includes(feat)
                          ? "border-brand-500 bg-brand-600/15 text-brand-300"
                          : "border-surface-700 bg-surface-800/40 text-surface-400 hover:border-surface-600"
                      }`}
                    >
                      <span className={`h-4 w-4 rounded border flex items-center justify-center text-xs ${
                        data.extraFeatures.includes(feat)
                          ? "bg-brand-500 border-brand-500 text-white"
                          : "border-surface-600"
                      }`}>
                        {data.extraFeatures.includes(feat) && <Check className="h-3 w-3" />}
                      </span>
                      {feat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ STEP 5: Review ═══ */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Review & Generate</h2>
                <p className="text-sm text-surface-400">Periksa kembali semua data sebelum generate prompt.</p>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Identity */}
                <div className="glass-light rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-brand-300 uppercase tracking-wide">Identitas</span>
                    <button onClick={() => setStep(0)} className="text-xs text-brand-400 hover:underline">Edit</button>
                  </div>
                  <p className="text-white font-semibold">{data.appName || "-"}</p>
                  <p className="text-xs text-surface-400 line-clamp-2">{data.appDescription || "-"}</p>
                  <p className="text-xs text-surface-500">{data.dataSource} · {data.userType}</p>
                </div>
                {/* Menus */}
                <div className="glass-light rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-brand-300 uppercase tracking-wide">Menu ({data.menus.length})</span>
                    <button onClick={() => setStep(1)} className="text-xs text-brand-400 hover:underline">Edit</button>
                  </div>
                  {data.menus.map((m, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-sm text-surface-300">
                      {renderMenuIcon(m.icon, "h-4 w-4 text-brand-400 shrink-0")}
                      <span>{m.name || "Menu belum diberi nama"}</span>
                    </div>
                  ))}
                </div>
                {/* Data */}
                <div className="glass-light rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-brand-300 uppercase tracking-wide">Data ({data.sheets.length} sheet)</span>
                    <button onClick={() => setStep(2)} className="text-xs text-brand-400 hover:underline">Edit</button>
                  </div>
                  {data.sheets.map((s, i) => {
                    const associatedMenu = data.menus.find((m) => m.name === s.menuName);
                    const iconName = associatedMenu ? associatedMenu.icon : "Database";
                    return (
                      <div key={i} className="flex items-center gap-1.5 text-sm text-surface-300">
                        {renderMenuIcon(iconName, "h-4 w-4 text-brand-400 shrink-0")}
                        <span>{s.sheetName} — {s.columns.length} kolom</span>
                      </div>
                    );
                  })}
                </div>
                {/* Appearance */}
                <div className="glass-light rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-brand-300 uppercase tracking-wide">Tampilan</span>
                    <button onClick={() => setStep(3)} className="text-xs text-brand-400 hover:underline">Edit</button>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-surface-300">
                    <Palette className="h-4 w-4 text-brand-400 shrink-0" />
                    <span>Tema: {data.colorTheme}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-surface-300">
                    <LayoutGrid className="h-4 w-4 text-brand-400 shrink-0" />
                    <span>Layout: {data.tableLayout}</span>
                  </div>
                  {data.hasLogin && (
                    <div className="flex items-center gap-1.5 text-sm text-surface-300">
                      <Lock className="h-4 w-4 text-brand-400 shrink-0" />
                      <span>Akses terbatas ({data.loginAccess || "Semua Akun Google"})</span>
                    </div>
                  )}
                  {data.hasEmailNotif && (
                    <div className="flex items-center gap-1.5 text-sm text-surface-300">
                      <Mail className="h-4 w-4 text-brand-400 shrink-0" />
                      <span>Notifikasi email: {data.emailTrigger}</span>
                    </div>
                  )}
                  {data.extraFeatures.length > 0 && (
                    <div className="flex items-center gap-1.5 text-sm text-surface-300">
                      <Sparkles className="h-4 w-4 text-brand-400 shrink-0" />
                      <span>{data.extraFeatures.length} fitur tambahan</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quota info */}
              {mounted && profile && (
                <div className="glass-light rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-surface-300">Sisa kuota bulan ini</p>
                    <p className="text-xl font-bold text-white">
                      {Math.max(0, profile.quotaLimit - profile.quotaUsed)}{" "}
                      <span className="text-sm text-surface-500 font-normal">/ {profile.quotaLimit}</span>
                    </p>
                  </div>
                  <div className="text-xs text-surface-500 capitalize">
                    Paket {profile.plan}
                  </div>
                </div>
              )}

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="btn-primary w-full !py-4 text-base flex items-center justify-center gap-2 animate-pulse-glow disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <>
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Generate Prompt
                  </>
                )}
              </button>
            </div>
          )}

          {/* ─── Nav Buttons ─── */}
          {step < 4 && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-surface-700/50">
              <button
                onClick={goBack}
                disabled={step === 0}
                className="btn-ghost flex items-center gap-2 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" /> Kembali
              </button>
              <button
                onClick={goNext}
                disabled={!canNext()}
                className="btn-primary flex items-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Lanjut <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Quota Modal ─── */}
      {showQuotaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl p-8 max-w-md w-full mx-4 animate-fade-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Kuota Habis</h3>
            </div>
            <p className="text-sm text-surface-400 mb-6">
              Kuota prompt bulanan Anda sudah habis. Upgrade paket untuk mendapatkan lebih banyak kuota.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowQuotaModal(false)} className="btn-ghost flex-1">
                Tutup
              </button>
              <a href="/account" className="btn-primary flex-1 text-center">
                Upgrade Paket
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
