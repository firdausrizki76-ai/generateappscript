"use client";

import { useState } from "react";
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Check,
  MessageSquare,
  Users,
  Palette,
  FileText,
  Loader2,
  PlusCircle,
  ArrowRight,
  LayoutGrid,
  Shield,
  Paintbrush,
  Send,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type {
  InterviewData,
  UserRoleDefinition,
  RoleMenuDetail,
  InterviewDesignPreferences,
} from "@/lib/store";

interface InterviewWizardProps {
  onComplete: (data: InterviewData) => void;
  generating: boolean;
}

const STEPS = [
  { id: 1, title: "Identitas Aplikasi", icon: FileText, desc: "Nama & tujuan aplikasi" },
  { id: 2, title: "Role Pengguna", icon: Shield, desc: "Siapa saja yang login?" },
  { id: 3, title: "Breakdown Menu", icon: LayoutGrid, desc: "Menu per role" },
  { id: 4, title: "Desain & Tema", icon: Paintbrush, desc: "Tampilan visual" },
  { id: 5, title: "Generate PRD", icon: Sparkles, desc: "Review & kirim ke AI" },
];

const COLOR_PRESETS = [
  { name: "Biru Profesional", hex: "#0d6efd" },
  { name: "Hijau Segar", hex: "#198754" },
  { name: "Ungu Modern", hex: "#6f42c1" },
  { name: "Indigo Premium", hex: "#6366f1" },
  { name: "Merah Elegan", hex: "#dc3545" },
  { name: "Teal Minimalis", hex: "#0d9488" },
];

const FONT_OPTIONS = [
  "Plus Jakarta Sans & Outfit",
  "Inter & Poppins",
  "Roboto & Montserrat",
  "DM Sans & Sora",
];

const UI_STYLES = [
  "Modern Premium (Glassmorphism)",
  "Clean Corporate",
  "Minimalis Elegan",
  "Bold & Colorful",
  "Soft Rounded (Friendly)",
];

function getDefaultMenu(): RoleMenuDetail {
  return {
    menuName: "",
    description: "",
    displayFields: "",
    hasCrud: true,
    crudDetails: "Tambah, Edit, Hapus dengan konfirmasi",
    specialFeatures: "",
  };
}

function getDefaultRole(): UserRoleDefinition {
  return {
    roleName: "",
    roleDescription: "",
    menus: [getDefaultMenu()],
  };
}

function getDefaultDesign(): InterviewDesignPreferences {
  return {
    themeColor: "#6366f1",
    fontFamily: "Plus Jakarta Sans & Outfit",
    uiStyle: "Modern Premium (Glassmorphism)",
    mode: "light",
  };
}

export default function InterviewWizard({ onComplete, generating }: InterviewWizardProps) {
  const [step, setStep] = useState(1);
  const [appName, setAppName] = useState("");
  const [appDescription, setAppDescription] = useState("");
  const [roles, setRoles] = useState<UserRoleDefinition[]>([getDefaultRole()]);
  const [activeRoleIndex, setActiveRoleIndex] = useState(0);
  const [design, setDesign] = useState<InterviewDesignPreferences>(getDefaultDesign());
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [customColor, setCustomColor] = useState("");

  // Validation
  const isStep1Valid = appName.trim().length > 0 && appDescription.trim().length > 10;
  const isStep2Valid = roles.length > 0 && roles.every((r) => r.roleName.trim().length > 0);
  const isStep3Valid = roles.every(
    (r) => r.menus.length > 0 && r.menus.every((m) => m.menuName.trim().length > 0 && m.description.trim().length > 0)
  );

  const canNext = () => {
    switch (step) {
      case 1: return isStep1Valid;
      case 2: return isStep2Valid;
      case 3: return isStep3Valid;
      case 4: return true;
      default: return false;
    }
  };

  const handleNext = () => {
    if (step < 5 && canNext()) setStep(step + 1);
  };
  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const addRole = () => {
    if (roles.length >= 6) return;
    setRoles([...roles, getDefaultRole()]);
    setActiveRoleIndex(roles.length);
  };

  const removeRole = (idx: number) => {
    if (roles.length <= 1) return;
    const next = roles.filter((_, i) => i !== idx);
    setRoles(next);
    if (activeRoleIndex >= next.length) setActiveRoleIndex(next.length - 1);
  };

  const updateRole = (idx: number, partial: Partial<UserRoleDefinition>) => {
    setRoles((prev) => prev.map((r, i) => (i === idx ? { ...r, ...partial } : r)));
  };

  const addMenuToRole = (roleIdx: number) => {
    setRoles((prev) =>
      prev.map((r, i) => (i === roleIdx ? { ...r, menus: [...r.menus, getDefaultMenu()] } : r))
    );
  };

  const removeMenuFromRole = (roleIdx: number, menuIdx: number) => {
    setRoles((prev) =>
      prev.map((r, i) =>
        i === roleIdx ? { ...r, menus: r.menus.filter((_, mi) => mi !== menuIdx) } : r
      )
    );
  };

  const updateMenuInRole = (roleIdx: number, menuIdx: number, partial: Partial<RoleMenuDetail>) => {
    setRoles((prev) =>
      prev.map((r, i) =>
        i === roleIdx
          ? { ...r, menus: r.menus.map((m, mi) => (mi === menuIdx ? { ...m, ...partial } : m)) }
          : r
      )
    );
  };

  const handleGenerate = () => {
    const interviewData: InterviewData = {
      appName,
      appDescription,
      targetUserRoles: roles,
      designPreferences: design,
      additionalNotes,
    };
    onComplete(interviewData);
  };

  // Total menus count
  const totalMenus = roles.reduce((sum, r) => sum + r.menus.length, 0);

  return (
    <div className="h-full flex flex-col">
      {/* ─── STEP PROGRESS BAR ─── */}
      <div className="shrink-0 border-b border-surface-800 bg-surface-900/60 backdrop-blur-xl px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between gap-2">
            {STEPS.map((s, i) => {
              const StepIcon = s.icon;
              const isActive = step === s.id;
              const isDone = step > s.id;
              return (
                <div key={s.id} className="flex items-center gap-2 flex-1">
                  <button
                    onClick={() => {
                      // Only allow clicking on completed or current steps
                      if (s.id <= step) setStep(s.id);
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 cursor-pointer ${
                      isActive
                        ? "bg-brand-500/20 border border-brand-500/40 text-white shadow-lg shadow-brand-500/10"
                        : isDone
                          ? "bg-green-500/10 border border-green-500/20 text-green-400"
                          : "bg-surface-800/40 border border-surface-700/50 text-surface-500"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        isActive
                          ? "bg-brand-500 text-white"
                          : isDone
                            ? "bg-green-500/20 text-green-400"
                            : "bg-surface-700 text-surface-400"
                      }`}
                    >
                      {isDone ? <Check className="w-3.5 h-3.5" /> : s.id}
                    </div>
                    <div className="hidden lg:block text-left">
                      <div className="text-xs font-semibold leading-tight">{s.title}</div>
                      <div className="text-[10px] opacity-60">{s.desc}</div>
                    </div>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-px max-w-8 ${isDone ? "bg-green-500/40" : "bg-surface-700"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── STEP CONTENT ─── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* STEP 1: Identity */}
          {step === 1 && (
            <div className="animate-fade-up space-y-8">
              <div>
                <h2 className="text-2xl font-bold font-display text-white mb-2 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-brand-400" />
                  </div>
                  Ceritakan Tentang Aplikasi Anda
                </h2>
                <p className="text-surface-400 text-sm">
                  Jelaskan secara detail aplikasi yang ingin Anda buat. Semakin detail deskripsi, semakin bagus hasil PRD yang dihasilkan AI.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-surface-200 mb-2">
                    Nama Aplikasi <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    placeholder="Contoh: Sistem Absensi Sekolah, Aplikasi Inventaris Kantor..."
                    className="w-full px-4 py-3.5 rounded-xl bg-surface-800/80 border border-surface-700 text-white placeholder:text-surface-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-surface-200 mb-2">
                    Deskripsi & Tujuan Aplikasi <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    rows={5}
                    value={appDescription}
                    onChange={(e) => setAppDescription(e.target.value)}
                    placeholder="Jelaskan secara detail:&#10;- Apa tujuan aplikasi ini?&#10;- Siapa yang akan menggunakan?&#10;- Fitur utama apa saja yang diinginkan?&#10;- Data apa saja yang dikelola?&#10;&#10;Contoh: Aplikasi untuk mengelola absensi harian siswa di sekolah XYZ. Siswa melakukan absensi lewat kode QR, guru bisa melihat rekap, dan admin mengelola data siswa & guru..."
                    className="w-full px-4 py-3.5 rounded-xl bg-surface-800/80 border border-surface-700 text-white placeholder:text-surface-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all text-sm leading-relaxed resize-none"
                  />
                  <p className="mt-2 text-xs text-surface-500">
                    Minimal 10 karakter. Semakin detail, semakin baik hasilnya.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Roles */}
          {step === 2 && (
            <div className="animate-fade-up space-y-8">
              <div>
                <h2 className="text-2xl font-bold font-display text-white mb-2 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-brand-400" />
                  </div>
                  Siapa yang Akan Login?
                </h2>
                <p className="text-surface-400 text-sm">
                  Tentukan role/peran pengguna yang akan memiliki akses ke aplikasi. Setiap role akan memiliki menu dan hak akses yang berbeda.
                </p>
              </div>

              <div className="space-y-4">
                {roles.map((role, idx) => (
                  <div
                    key={idx}
                    className="group relative glass-light rounded-2xl p-5 transition-all duration-300 hover:border-brand-500/30"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/20 flex items-center justify-center shrink-0 mt-1">
                        <Users className="w-5 h-5 text-brand-400" />
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="text"
                            value={role.roleName}
                            onChange={(e) => updateRole(idx, { roleName: e.target.value })}
                            placeholder="Nama Role (misal: Admin, Pimpinan, Guru)"
                            className="flex-1 px-3 py-2.5 rounded-lg bg-surface-800/80 border border-surface-700 text-white placeholder:text-surface-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all text-sm font-semibold"
                          />
                          {roles.length > 1 && (
                            <button
                              onClick={() => removeRole(idx)}
                              className="p-2 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              title="Hapus role"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <textarea
                          rows={2}
                          value={role.roleDescription}
                          onChange={(e) => updateRole(idx, { roleDescription: e.target.value })}
                          placeholder="Deskripsi singkat role ini. Misal: Administrator yang mengelola semua data & konfigurasi sistem"
                          className="w-full px-3 py-2.5 rounded-lg bg-surface-800/80 border border-surface-700 text-white placeholder:text-surface-500 focus:border-brand-500 transition-all text-sm resize-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={addRole}
                disabled={roles.length >= 6}
                className="w-full py-3 rounded-xl border-2 border-dashed border-surface-700 hover:border-brand-500/40 text-surface-400 hover:text-brand-400 flex items-center justify-center gap-2 transition-all text-sm font-medium disabled:opacity-40"
              >
                <PlusCircle className="w-4 h-4" />
                Tambah Role Baru {roles.length >= 6 && "(Maks 6)"}
              </button>
            </div>
          )}

          {/* STEP 3: Menu Breakdown per Role */}
          {step === 3 && (
            <div className="animate-fade-up space-y-6">
              <div>
                <h2 className="text-2xl font-bold font-display text-white mb-2 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center">
                    <LayoutGrid className="w-5 h-5 text-brand-400" />
                  </div>
                  Breakdown Menu per Role
                </h2>
                <p className="text-surface-400 text-sm">
                  Jelaskan detail menu untuk setiap role. Pilih tab role, lalu tambahkan menu beserta detail fungsinya.
                </p>
              </div>

              {/* Role Tabs */}
              <div className="flex gap-2 flex-wrap">
                {roles.map((role, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveRoleIndex(idx)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                      activeRoleIndex === idx
                        ? "bg-brand-500 text-white shadow-lg shadow-brand-500/25"
                        : "bg-surface-800/60 text-surface-300 hover:bg-surface-800 hover:text-white border border-surface-700"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    {role.roleName || `Role ${idx + 1}`}
                    <span className="text-[10px] opacity-70 bg-white/10 px-1.5 py-0.5 rounded-full">
                      {role.menus.length} menu
                    </span>
                  </button>
                ))}
              </div>

              {/* Active Role Menus */}
              {roles[activeRoleIndex] && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-surface-200">
                      Menu untuk <span className="text-brand-400">{roles[activeRoleIndex].roleName || "Role ini"}</span>:
                    </h3>
                  </div>

                  {roles[activeRoleIndex].menus.map((menu, menuIdx) => (
                    <div key={menuIdx} className="glass-light rounded-2xl p-5 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-500/15 flex items-center justify-center text-xs font-bold text-brand-400 shrink-0">
                          {menuIdx + 1}
                        </div>
                        <input
                          type="text"
                          value={menu.menuName}
                          onChange={(e) =>
                            updateMenuInRole(activeRoleIndex, menuIdx, { menuName: e.target.value })
                          }
                          placeholder="Nama Menu (misal: Dashboard, Data Siswa, Laporan)"
                          className="flex-1 px-3 py-2.5 rounded-lg bg-surface-800/80 border border-surface-700 text-white placeholder:text-surface-500 focus:border-brand-500 transition-all text-sm font-semibold"
                        />
                        {roles[activeRoleIndex].menus.length > 1 && (
                          <button
                            onClick={() => removeMenuFromRole(activeRoleIndex, menuIdx)}
                            className="p-2 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <textarea
                        rows={2}
                        value={menu.description}
                        onChange={(e) =>
                          updateMenuInRole(activeRoleIndex, menuIdx, { description: e.target.value })
                        }
                        placeholder="Jelaskan fungsi menu ini. Misal: Menampilkan dashboard ringkasan total siswa, guru, dan grafik kehadiran per bulan"
                        className="w-full px-3 py-2.5 rounded-lg bg-surface-800/80 border border-surface-700 text-white placeholder:text-surface-500 focus:border-brand-500 transition-all text-sm resize-none"
                      />

                      <div>
                        <label className="block text-xs font-medium text-surface-400 mb-1.5">
                          Data apa yang ditampilkan di menu ini?
                        </label>
                        <input
                          type="text"
                          value={menu.displayFields}
                          onChange={(e) =>
                            updateMenuInRole(activeRoleIndex, menuIdx, { displayFields: e.target.value })
                          }
                          placeholder="Contoh: Nama siswa, NIS, Kelas, Status Aktif, Tanggal Lahir"
                          className="w-full px-3 py-2.5 rounded-lg bg-surface-800/80 border border-surface-700 text-white placeholder:text-surface-500 focus:border-brand-500 transition-all text-sm"
                        />
                      </div>

                      <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 text-sm text-surface-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={menu.hasCrud}
                            onChange={(e) =>
                              updateMenuInRole(activeRoleIndex, menuIdx, { hasCrud: e.target.checked })
                            }
                            className="w-4 h-4 rounded border-surface-600 bg-surface-800 accent-brand-500"
                          />
                          Ada CRUD (Tambah/Edit/Hapus)
                        </label>
                      </div>

                      {menu.hasCrud && (
                        <div>
                          <label className="block text-xs font-medium text-surface-400 mb-1.5">
                            Detail operasi CRUD
                          </label>
                          <input
                            type="text"
                            value={menu.crudDetails}
                            onChange={(e) =>
                              updateMenuInRole(activeRoleIndex, menuIdx, { crudDetails: e.target.value })
                            }
                            placeholder="Misal: Tambah data lewat form modal, edit inline, hapus dengan konfirmasi"
                            className="w-full px-3 py-2.5 rounded-lg bg-surface-800/80 border border-surface-700 text-white placeholder:text-surface-500 focus:border-brand-500 transition-all text-sm"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-medium text-surface-400 mb-1.5">
                          Fitur khusus lainnya (opsional)
                        </label>
                        <input
                          type="text"
                          value={menu.specialFeatures}
                          onChange={(e) =>
                            updateMenuInRole(activeRoleIndex, menuIdx, { specialFeatures: e.target.value })
                          }
                          placeholder="Misal: Filter by kelas, Export PDF/CSV, Grafik chart, KPI cards, Pencarian"
                          className="w-full px-3 py-2.5 rounded-lg bg-surface-800/80 border border-surface-700 text-white placeholder:text-surface-500 focus:border-brand-500 transition-all text-sm"
                        />
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => addMenuToRole(activeRoleIndex)}
                    className="w-full py-3 rounded-xl border-2 border-dashed border-surface-700 hover:border-brand-500/40 text-surface-400 hover:text-brand-400 flex items-center justify-center gap-2 transition-all text-sm font-medium"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Tambah Menu untuk {roles[activeRoleIndex].roleName || "Role ini"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Design Preferences */}
          {step === 4 && (
            <div className="animate-fade-up space-y-8">
              <div>
                <h2 className="text-2xl font-bold font-display text-white mb-2 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center">
                    <Paintbrush className="w-5 h-5 text-brand-400" />
                  </div>
                  Desain & Tampilan Aplikasi
                </h2>
                <p className="text-surface-400 text-sm">
                  Pilih preferensi visual untuk aplikasi Anda. AI akan menggunakan ini sebagai panduan desain.
                </p>
              </div>

              {/* Color Theme */}
              <div>
                <label className="block text-sm font-semibold text-surface-200 mb-3">Warna Tema Utama</label>
                <div className="flex flex-wrap gap-3">
                  {COLOR_PRESETS.map((cp) => (
                    <button
                      key={cp.hex}
                      onClick={() => setDesign({ ...design, themeColor: cp.hex })}
                      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all duration-200 ${
                        design.themeColor === cp.hex
                          ? "border-white/40 bg-surface-800 shadow-lg"
                          : "border-surface-700 bg-surface-800/40 hover:border-surface-600"
                      }`}
                    >
                      <div
                        className="w-6 h-6 rounded-full border-2 border-white/20 shrink-0"
                        style={{ background: cp.hex }}
                      />
                      <span className="text-xs font-medium text-surface-200">{cp.name}</span>
                      {design.themeColor === cp.hex && <Check className="w-3.5 h-3.5 text-green-400" />}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-xs text-surface-400">Atau custom:</span>
                  <input
                    type="color"
                    value={customColor || design.themeColor}
                    onChange={(e) => {
                      setCustomColor(e.target.value);
                      setDesign({ ...design, themeColor: e.target.value });
                    }}
                    className="w-10 h-8 rounded-lg cursor-pointer bg-surface-800 border border-surface-700"
                  />
                  <span className="text-xs text-surface-400 font-mono">{design.themeColor}</span>
                </div>
              </div>

              {/* Font */}
              <div>
                <label className="block text-sm font-semibold text-surface-200 mb-3">Font Family</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {FONT_OPTIONS.map((font) => (
                    <button
                      key={font}
                      onClick={() => setDesign({ ...design, fontFamily: font })}
                      className={`px-4 py-3 rounded-xl border text-left transition-all text-sm ${
                        design.fontFamily === font
                          ? "border-brand-500/50 bg-brand-500/10 text-white"
                          : "border-surface-700 bg-surface-800/40 text-surface-300 hover:border-surface-600"
                      }`}
                    >
                      {font}
                    </button>
                  ))}
                </div>
              </div>

              {/* UI Style */}
              <div>
                <label className="block text-sm font-semibold text-surface-200 mb-3">Gaya Tampilan</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {UI_STYLES.map((style) => (
                    <button
                      key={style}
                      onClick={() => setDesign({ ...design, uiStyle: style })}
                      className={`px-4 py-3 rounded-xl border text-left transition-all text-sm ${
                        design.uiStyle === style
                          ? "border-brand-500/50 bg-brand-500/10 text-white"
                          : "border-surface-700 bg-surface-800/40 text-surface-300 hover:border-surface-600"
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode */}
              <div>
                <label className="block text-sm font-semibold text-surface-200 mb-3">Mode Tampilan</label>
                <div className="flex gap-3">
                  {(["light", "dark", "auto"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setDesign({ ...design, mode })}
                      className={`flex-1 px-4 py-3 rounded-xl border text-center capitalize transition-all text-sm font-medium ${
                        design.mode === mode
                          ? "border-brand-500/50 bg-brand-500/10 text-white"
                          : "border-surface-700 bg-surface-800/40 text-surface-300 hover:border-surface-600"
                      }`}
                    >
                      {mode === "auto" ? "Auto (Ikuti Sistem)" : mode === "light" ? "☀️ Terang" : "🌙 Gelap"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Review & Generate */}
          {step === 5 && (
            <div className="animate-fade-up space-y-8">
              <div>
                <h2 className="text-2xl font-bold font-display text-white mb-2 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-brand-400" />
                  </div>
                  Review & Generate PRD
                </h2>
                <p className="text-surface-400 text-sm">
                  Periksa ringkasan data interview Anda. Jika sudah benar, klik tombol di bawah untuk mengirim ke AI dan menghasilkan PRD super lengkap.
                </p>
              </div>

              {/* Summary Cards */}
              <div className="space-y-4">
                {/* App Info */}
                <div className="glass-light rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-brand-400" />
                    <h4 className="text-sm font-bold text-surface-200">Identitas Aplikasi</h4>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex gap-2">
                      <span className="text-surface-500 shrink-0">Nama:</span>
                      <span className="text-white font-semibold">{appName}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-surface-500 shrink-0">Deskripsi:</span>
                      <span className="text-surface-300">{appDescription.substring(0, 200)}{appDescription.length > 200 ? "..." : ""}</span>
                    </div>
                  </div>
                </div>

                {/* Roles Summary */}
                <div className="glass-light rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4 text-brand-400" />
                    <h4 className="text-sm font-bold text-surface-200">
                      {roles.length} Role — {totalMenus} Menu Total
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {roles.map((role, idx) => (
                      <div key={idx} className="bg-surface-800/50 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Users className="w-3.5 h-3.5 text-brand-400" />
                          <span className="text-sm font-bold text-white">{role.roleName}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-300">
                            {role.menus.length} menu
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 ml-5">
                          {role.menus.map((m, mi) => (
                            <span
                              key={mi}
                              className="text-[11px] px-2 py-1 rounded-lg bg-surface-700/60 text-surface-300"
                            >
                              {m.menuName || "Menu tanpa nama"}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Design Summary */}
                <div className="glass-light rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Paintbrush className="w-4 h-4 text-brand-400" />
                    <h4 className="text-sm font-bold text-surface-200">Preferensi Desain</h4>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-800/50 border border-surface-700">
                      <div className="w-4 h-4 rounded-full" style={{ background: design.themeColor }} />
                      <span className="text-surface-300">{design.themeColor}</span>
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-surface-800/50 border border-surface-700 text-surface-300">
                      {design.fontFamily}
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-surface-800/50 border border-surface-700 text-surface-300">
                      {design.uiStyle}
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-surface-800/50 border border-surface-700 text-surface-300 capitalize">
                      {design.mode}
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-sm font-semibold text-surface-200 mb-2">
                  Catatan Tambahan (opsional)
                </label>
                <textarea
                  rows={3}
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Ada fitur khusus atau catatan tambahan? Misal: Perlu fitur WhatsApp notification, Perlu export ke PDF, Data terhubung antar sheet, dll..."
                  className="w-full px-4 py-3 rounded-xl bg-surface-800/80 border border-surface-700 text-white placeholder:text-surface-500 focus:border-brand-500 transition-all text-sm resize-none"
                />
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed text-white shadow-xl hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99]"
                style={{
                  background: generating
                    ? "linear-gradient(135deg, #475569, #334155)"
                    : `linear-gradient(135deg, ${design.themeColor}, ${design.themeColor}dd, ${design.themeColor}bb)`,
                  boxShadow: generating
                    ? "none"
                    : `0 10px 40px -10px ${design.themeColor}60`,
                }}
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>AI sedang menghasilkan PRD...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>🚀 Generate PRD Super Lengkap</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {generating && (
                <div className="text-center space-y-2">
                  <div className="w-full h-1.5 rounded-full bg-surface-800 overflow-hidden">
                    <div
                      className="h-full rounded-full animate-shimmer"
                      style={{ background: `linear-gradient(90deg, transparent, ${design.themeColor}40, transparent)`, backgroundSize: "200% 100%" }}
                    />
                  </div>
                  <p className="text-xs text-surface-500">
                    Mengirim data interview ke AI (DeepSeek v4 Pro)... Proses ini memakan waktu 15-40 detik.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── BOTTOM NAV ─── */}
      {step < 5 && (
        <div className="shrink-0 border-t border-surface-800 bg-surface-900/80 backdrop-blur-xl px-6 py-4">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <button
              onClick={handleBack}
              disabled={step === 1}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed text-surface-300 hover:text-white hover:bg-surface-800"
            >
              <ChevronLeft className="w-4 h-4" />
              Kembali
            </button>

            <div className="text-xs text-surface-500">
              Langkah {step} dari 5
            </div>

            <button
              onClick={handleNext}
              disabled={!canNext()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-brand-500 text-white hover:bg-brand-600 shadow-lg shadow-brand-500/20"
            >
              Lanjut
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {step === 5 && !generating && (
        <div className="shrink-0 border-t border-surface-800 bg-surface-900/80 backdrop-blur-xl px-6 py-4">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all text-surface-300 hover:text-white hover:bg-surface-800"
            >
              <ChevronLeft className="w-4 h-4" />
              Kembali
            </button>
            <div className="text-xs text-surface-500">
              Langkah {step} dari 5 — Review Final
            </div>
            <div />
          </div>
        </div>
      )}
    </div>
  );
}
