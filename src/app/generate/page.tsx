"use client";

import { useState, useEffect, useMemo } from "react";
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
  MoreVertical,
  Search,
  Download,
  SlidersHorizontal,
  X,
  Smartphone,
  Monitor
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

const dataSourceOptions = ["Google Sheets", "Google Forms + Sheets", "Google Drive", "Kombinasi"];
const userTypeOptions = ["Hanya saya sendiri", "Tim kecil (< 10 orang)", "Banyak pengguna"];
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
  ClipboardList, Users, BarChart3, Package, DollarSign, Calendar, Bell, FileEdit, Settings, Folder, TrendingUp, Tag,
};

const renderMenuIcon = (iconName: string, className = "h-4 w-4 inline mr-1 text-brand-400") => {
  const IconComp = iconMap[iconName];
  if (IconComp) return <IconComp className={className} />;
  
  // Fallbacks for older data using emojis
  const fallbackEmojis: Record<string, string> = {
    "📋": "ClipboardList", "👥": "Users", "📊": "BarChart3", "📦": "Package", "💰": "DollarSign",
    "📅": "Calendar", "🔔": "Bell", "📝": "FileEdit", "⚙️": "Settings", "🗂️": "Folder", "📈": "TrendingUp", "🏷️": "Tag",
  };
  const mappedIcon = fallbackEmojis[iconName];
  if (mappedIcon && iconMap[mappedIcon]) {
    const FallbackIcon = iconMap[mappedIcon];
    return <FallbackIcon className={className} />;
  }
  return <Database className={className} />; // safe fallback
};

const colorPresets = [
  { name: "Biru profesional", color: "#0d6efd" },
  { name: "Hijau segar", color: "#198754" },
  { name: "Ungu modern", color: "#6f42c1" },
  { name: "Abu netral", color: "#6c757d" },
  { name: "Custom hex", color: "" },
];

export default function GeneratePage() {
  const router = useRouter();
  const [data, setData] = useState<WizardData>(getDefaultWizardData());
  const [generating, setGenerating] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  // Builder UI State
  const [activeMenuIndex, setActiveMenuIndex] = useState<number>(0);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");

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
    
    // Default name if empty
    if (!data.appName) {
      setData(prev => ({...prev, appName: "Aplikasi Baru", appDescription: "Aplikasi internal untuk manajemen data."}));
    }
  }, [router]);

  /* ─── Data Syncing Helpers ─── */
  
  const updateData = (partial: Partial<WizardData>) => setData((prev) => ({ ...prev, ...partial }));

  const syncSheetsWithMenus = (currentMenus: MenuItem[], currentSheets: SheetDef[]) => {
    // We create a sheet for every menu that has CRUD operations
    const crudMenus = currentMenus.filter(m => m.crud.create || m.crud.update || m.crud.delete || m.crud.read);
    const newSheets: SheetDef[] = crudMenus.map(menu => {
      const existing = currentSheets.find(s => s.menuName === menu.name);
      return existing || {
        menuName: menu.name || "Menu Baru",
        sheetName: `Sheet_${(menu.name || "Menu").replace(/\s+/g, "_")}`,
        columns: [{ name: "Nama", type: "Teks", required: true, note: "" }],
        autoCreatedAt: true,
        autoUpdatedAt: true,
        autoCreatedBy: false,
      };
    });
    return newSheets;
  };

  const updateMenu = (idx: number, partial: Partial<MenuItem>) => {
    setData((prev) => {
      const menus = [...prev.menus];
      
      // If menu name is changed, we must rename the associated sheet's menuName to keep them linked
      let sheets = [...prev.sheets];
      if (partial.name !== undefined && menus[idx].name !== partial.name) {
        const oldName = menus[idx].name;
        sheets = sheets.map(s => s.menuName === oldName ? { ...s, menuName: partial.name! } : s);
      }
      
      menus[idx] = { ...menus[idx], ...partial };
      const syncedSheets = syncSheetsWithMenus(menus, sheets);
      return { ...prev, menus, sheets: syncedSheets };
    });
  };

  const addMenu = () => {
    if (data.menus.length >= 10) return;
    setData((prev) => {
      const newMenuName = `Menu ${prev.menus.length + 1}`;
      const newMenu: MenuItem = {
        name: newMenuName,
        icon: "ClipboardList",
        description: "Deskripsi menu baru",
        crud: { create: true, read: true, update: true, delete: true },
        hasFilter: true,
        filterColumns: "",
        hasExport: false,
        exportFormats: [],
      };
      const menus = [...prev.menus, newMenu];
      const sheets = syncSheetsWithMenus(menus, prev.sheets);
      
      // Set active menu to the newly created one
      setTimeout(() => setActiveMenuIndex(menus.length - 1), 0);
      
      return { ...prev, menus, sheets };
    });
  };

  const removeMenu = (idx: number) => {
    if (data.menus.length <= 1) return;
    setData((prev) => {
      const menuToRemove = prev.menus[idx];
      const menus = prev.menus.filter((_, i) => i !== idx);
      const sheets = prev.sheets.filter(s => s.menuName !== menuToRemove.name);
      
      if (activeMenuIndex >= menus.length) {
        setActiveMenuIndex(menus.length - 1);
      } else if (activeMenuIndex === idx) {
        setActiveMenuIndex(0);
      }
      
      return { ...prev, menus, sheets };
    });
  };

  const getActiveSheetIndex = () => {
    const activeMenu = data.menus[activeMenuIndex];
    if (!activeMenu) return -1;
    return data.sheets.findIndex(s => s.menuName === activeMenu.name);
  };

  const updateSheet = (sIdx: number, partial: Partial<SheetDef>) =>
    setData((prev) => {
      if (sIdx < 0 || sIdx >= prev.sheets.length) return prev;
      const sheets = [...prev.sheets];
      sheets[sIdx] = { ...sheets[sIdx], ...partial };
      return { ...prev, sheets };
    });

  const updateColumn = (sIdx: number, cIdx: number, partial: Partial<ColumnDef>) =>
    setData((prev) => {
      if (sIdx < 0 || sIdx >= prev.sheets.length) return prev;
      const sheets = [...prev.sheets];
      const columns = [...sheets[sIdx].columns];
      columns[cIdx] = { ...columns[cIdx], ...partial };
      sheets[sIdx] = { ...sheets[sIdx], columns };
      return { ...prev, sheets };
    });

  const addColumn = (sIdx: number) =>
    setData((prev) => {
      if (sIdx < 0 || sIdx >= prev.sheets.length) return prev;
      const sheets = [...prev.sheets];
      sheets[sIdx] = {
        ...sheets[sIdx],
        columns: [...sheets[sIdx].columns, { name: "", type: "Teks", required: false, note: "" }],
      };
      return { ...prev, sheets };
    });

  const removeColumn = (sIdx: number, cIdx: number) =>
    setData((prev) => {
      if (sIdx < 0 || sIdx >= prev.sheets.length) return prev;
      const sheets = [...prev.sheets];
      sheets[sIdx] = {
        ...sheets[sIdx],
        columns: sheets[sIdx].columns.filter((_, i) => i !== cIdx),
      };
      return { ...prev, sheets };
    });

  /* ─── Theme Colors ─── */
  const activeColor = useMemo(() => {
    if (data.colorTheme === "Custom hex" && data.customColor) return data.customColor;
    const preset = colorPresets.find(p => p.name === data.colorTheme);
    return preset?.color || "#6366f1";
  }, [data.colorTheme, data.customColor]);

  /* ─── Validation & Submit ─── */
  const isDataValid = () => {
    if (!data.appName.trim()) return false;
    if (!data.appDescription.trim()) return false;
    if (data.menus.some(m => !m.name.trim())) return false;
    return true;
  };

  const handleGenerate = async () => {
    if (!isDataValid()) {
      alert("Mohon lengkapi Nama Aplikasi dan Nama Menu sebelum generate.");
      return;
    }
    
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

  const activeMenu = data.menus[activeMenuIndex] || data.menus[0];
  const activeSheetIndex = getActiveSheetIndex();
  const activeSheet = activeSheetIndex >= 0 ? data.sheets[activeSheetIndex] : null;

  return (
    <div className="h-[calc(100vh-70px)] flex flex-col md:flex-row overflow-hidden bg-surface-950">
      
      {/* ─── SIDEBAR: GLOBAL SETTINGS ─── */}
      <div className="w-full md:w-80 lg:w-96 flex flex-col border-r border-surface-800 bg-surface-900/50 backdrop-blur-xl shrink-0 overflow-y-auto custom-scrollbar shadow-2xl z-20">
        <div className="p-6 space-y-8 flex-1">
          <div>
            <h1 className="text-xl font-bold font-display text-white mb-2 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand-400" /> App Settings
            </h1>
            <p className="text-xs text-surface-400">Atur properti dasar dan tampilan global aplikasi Anda.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1.5 uppercase tracking-wider">Nama Aplikasi</label>
              <input
                type="text"
                value={data.appName}
                onChange={(e) => updateData({ appName: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-800/80 border border-surface-700 text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition text-sm font-semibold"
                placeholder="Nama Aplikasi"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1.5 uppercase tracking-wider">Deskripsi / Tujuan</label>
              <textarea
                rows={2}
                value={data.appDescription}
                onChange={(e) => updateData({ appDescription: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-800/80 border border-surface-700 text-white focus:border-brand-500 transition text-sm resize-none"
                placeholder="Deskripsikan fungsi aplikasi..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-surface-300 mb-2 uppercase tracking-wider">Warna Utama</label>
              <div className="flex flex-wrap gap-2">
                {colorPresets.map((cp) => (
                  <button
                    key={cp.name}
                    onClick={() => updateData({ colorTheme: cp.name, customColor: cp.color || data.customColor })}
                    title={cp.name}
                    className={`h-8 w-8 rounded-full border-2 transition-all transform hover:scale-110 ${
                      data.colorTheme === cp.name ? "border-white scale-110 shadow-lg shadow-black/50" : "border-transparent"
                    }`}
                    style={{ background: cp.color || "linear-gradient(45deg, red, blue)" }}
                  />
                ))}
              </div>
              {data.colorTheme === "Custom hex" && (
                <input
                  type="color"
                  value={data.customColor}
                  onChange={(e) => updateData({ customColor: e.target.value })}
                  className="mt-3 w-full h-10 rounded-xl cursor-pointer bg-surface-800 border-none"
                />
              )}
            </div>
          </div>

          <button
            onClick={() => setShowAdvancedSettings(true)}
            className="w-full py-3 px-4 rounded-xl border border-surface-700 bg-surface-800/50 hover:bg-surface-800 text-surface-200 flex items-center justify-between transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-medium"><SlidersHorizontal className="h-4 w-4" /> Pengaturan Lanjutan</span>
            <ChevronRight className="h-4 w-4 text-surface-500" />
          </button>
        </div>

        {/* Generate Button Sticky Bottom */}
        <div className="p-6 bg-surface-900 border-t border-surface-800 sticky bottom-0">
           {profile && (
            <div className="flex items-center justify-between mb-4 text-xs text-surface-400">
              <span>Sisa Kuota: {Math.max(0, profile.quotaLimit - profile.quotaUsed)}/{profile.quotaLimit}</span>
              <span className="uppercase text-[10px] font-bold tracking-wider text-brand-400">{profile.plan} Plan</span>
            </div>
          )}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn-primary w-full !py-4 text-base font-bold shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] transition-all flex items-center justify-center gap-2 rounded-xl"
            style={{ backgroundColor: activeColor }}
          >
            {generating ? (
              <><div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Merakit Aplikasi...</>
            ) : (
              <><Sparkles className="h-5 w-5" /> Generate App</>
            )}
          </button>
        </div>
      </div>

      {/* ─── MAIN CANVAS: VISUAL BUILDER ─── */}
      <div className="flex-1 relative bg-[url('/grid.svg')] bg-center bg-repeat bg-surface-950 flex flex-col p-4 md:p-8 overflow-hidden">
        {/* Preview controls */}
        <div className="absolute top-4 right-4 z-10 flex bg-surface-900 border border-surface-700 rounded-lg p-1 shadow-lg">
          <button 
            onClick={() => setPreviewMode("desktop")}
            className={`p-1.5 rounded-md transition-colors ${previewMode === "desktop" ? "bg-surface-700 text-white" : "text-surface-400 hover:text-white"}`}
          >
            <Monitor className="h-4 w-4" />
          </button>
          <button 
            onClick={() => setPreviewMode("mobile")}
            className={`p-1.5 rounded-md transition-colors ${previewMode === "mobile" ? "bg-surface-700 text-white" : "text-surface-400 hover:text-white"}`}
          >
            <Smartphone className="h-4 w-4" />
          </button>
        </div>

        {/* The Mockup Frame */}
        <div className={`mx-auto transition-all duration-500 ease-in-out flex flex-col bg-white overflow-hidden shadow-2xl rounded-2xl ring-1 ring-surface-800/50 ${
          previewMode === "mobile" ? "w-full max-w-[375px] h-[812px]" : "w-full max-w-5xl h-full min-h-[600px]"
        }`}>
          
          {/* Mockup Header */}
          <div className="h-14 shrink-0 flex items-center justify-between px-4 sm:px-6 shadow-sm z-10 text-white transition-colors duration-500" style={{ backgroundColor: activeColor }}>
            <div className="flex items-center gap-3">
              {previewMode === "mobile" && <MoreVertical className="h-5 w-5 opacity-70" />}
              <div className="font-bold text-lg tracking-tight font-display drop-shadow-sm truncate max-w-[200px] sm:max-w-md">
                {data.appName}
              </div>
            </div>
            <div className="flex items-center gap-3 opacity-90">
              <Bell className="h-4 w-4 hidden sm:block" />
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/30">
                <Users className="h-4 w-4" />
              </div>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden relative text-slate-800 bg-slate-50">
            {/* Mockup Sidebar (Navigation) */}
            <div className={`${previewMode === "mobile" ? "hidden" : "w-64"} shrink-0 border-r border-slate-200 bg-white flex flex-col`}>
              <div className="p-4 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input type="text" placeholder="Search..." disabled className="w-full pl-9 pr-3 py-2 bg-slate-100 rounded-lg text-sm text-slate-500 border-none outline-none" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                <div className="text-xs font-semibold text-slate-400 mb-3 px-3 uppercase tracking-wider">Main Menu</div>
                {data.menus.map((menu, idx) => (
                  <div key={idx} className="group relative">
                    <button
                      onClick={() => setActiveMenuIndex(idx)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${
                        activeMenuIndex === idx 
                        ? "bg-slate-100 text-slate-900 shadow-sm" 
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <div style={{ color: activeMenuIndex === idx ? activeColor : "#64748b" }}>
                        {renderMenuIcon(menu.icon, "h-4.5 w-4.5")}
                      </div>
                      <span className="truncate flex-1 text-left">{menu.name || "Menu Tanpa Nama"}</span>
                    </button>
                    {data.menus.length > 1 && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeMenu(idx); }}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ${activeMenuIndex === idx ? "opacity-100" : ""}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                <button
                  onClick={addMenu}
                  disabled={data.menus.length >= 10}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-dashed border-slate-300 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-800 hover:border-slate-400 hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" /> Tambah Menu
                </button>
              </div>
            </div>

            {/* Mockup Main Content (The Workspace) */}
            <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50">
              {/* Toolbar */}
              <div className="bg-white border-b border-slate-200 p-4 sm:px-8 py-5">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={activeMenu.name}
                      onChange={(e) => updateMenu(activeMenuIndex, { name: e.target.value })}
                      className="text-2xl font-bold text-slate-900 bg-transparent border-none p-0 focus:ring-0 focus:outline-none w-full mb-1 placeholder-slate-300 transition-colors hover:bg-slate-100 rounded px-1 -ml-1"
                      placeholder="Nama Menu..."
                    />
                    <input
                      type="text"
                      value={activeMenu.description}
                      onChange={(e) => updateMenu(activeMenuIndex, { description: e.target.value })}
                      className="text-sm text-slate-500 bg-transparent border-none p-0 focus:ring-0 focus:outline-none w-full placeholder-slate-300 transition-colors hover:bg-slate-100 rounded px-1 -ml-1"
                      placeholder="Deskripsi untuk menu ini..."
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative group">
                      <button className="h-10 w-10 rounded-lg border border-slate-200 bg-white shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors">
                        {renderMenuIcon(activeMenu.icon, "h-5 w-5")}
                      </button>
                      <div className="absolute right-0 top-12 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-2 hidden group-hover:grid grid-cols-4 gap-1 z-50">
                         {menuIconOptions.map((item) => (
                           <button
                             key={item.name}
                             onClick={() => updateMenu(activeMenuIndex, { icon: item.name })}
                             className={`aspect-square rounded-lg flex items-center justify-center ${
                               activeMenu.icon === item.name ? "bg-slate-100 ring-1 ring-slate-300 text-slate-900" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                             }`}
                           >
                             <item.component className="h-5 w-5" />
                           </button>
                         ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Simulated Actions Bar based on CRUD & Export */}
                <div className="flex flex-wrap items-center gap-2 mt-6">
                  {activeMenu.crud.create && (
                    <button className="px-4 py-2 rounded-lg text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 flex items-center gap-2" style={{ backgroundColor: activeColor }}>
                      <Plus className="h-4 w-4" /> Tambah Data
                    </button>
                  )}
                  {activeMenu.hasFilter && (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input type="text" placeholder="Filter..." disabled className="pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-500 w-48 shadow-sm" />
                    </div>
                  )}
                  <div className="flex-1" />
                  {activeMenu.hasExport && (
                    <button className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 flex items-center gap-2">
                      <Download className="h-4 w-4" /> Export
                    </button>
                  )}
                </div>
              </div>

              {/* Data Table Workspace */}
              <div className="p-4 sm:p-8 flex-1">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                  {/* CRUD Toggle Editor inside the table header */}
                  <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Database className="h-4 w-4 text-slate-400" /> 
                      <span className="font-medium">Struktur Kolom Data</span>
                    </div>
                    
                    <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm gap-1">
                      {(["create", "read", "update", "delete"] as const).map((op) => (
                        <button
                          key={op}
                          onClick={() => updateMenu(activeMenuIndex, { crud: { ...activeMenu.crud, [op]: !activeMenu.crud[op] } })}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all flex items-center gap-1.5 ${
                            activeMenu.crud[op]
                              ? "bg-slate-100 text-slate-800"
                              : "text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          {op === "create" && <Plus className="h-3 w-3" />}
                          {op === "read" && <Eye className="h-3 w-3" />}
                          {op === "update" && <RefreshCw className="h-3 w-3" />}
                          {op === "delete" && <Trash2 className="h-3 w-3" />}
                          {op}
                        </button>
                      ))}
                    </div>
                  </div>

                  {activeSheet ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                          <tr>
                            <th className="px-4 py-3 w-10">No</th>
                            <th className="px-4 py-3">Nama Kolom</th>
                            <th className="px-4 py-3 w-32">Tipe Data</th>
                            <th className="px-4 py-3 w-24 text-center">Wajib?</th>
                            <th className="px-4 py-3 w-16"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {/* Auto Columns Preview */}
                          {activeSheet.autoCreatedAt && (
                            <tr className="bg-slate-50/50 opacity-60">
                              <td className="px-4 py-3 text-center">-</td>
                              <td className="px-4 py-3"><span className="flex items-center gap-2"><Lock className="h-3 w-3"/> createdAt (Otomatis)</span></td>
                              <td className="px-4 py-3">Tanggal</td>
                              <td className="px-4 py-3 text-center"><Check className="h-4 w-4 mx-auto text-slate-400" /></td>
                              <td className="px-4 py-3"></td>
                            </tr>
                          )}
                          {/* Editable Columns */}
                          {activeSheet.columns.map((col, cIdx) => (
                            <tr key={cIdx} className="group hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 text-slate-400 text-center">{cIdx + 1}</td>
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={col.name}
                                  onChange={(e) => updateColumn(activeSheetIndex, cIdx, { name: e.target.value })}
                                  placeholder="Nama Kolom"
                                  className="w-full bg-transparent border-b border-dashed border-transparent hover:border-slate-300 focus:border-slate-400 focus:outline-none transition-colors py-1"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <select
                                  value={col.type}
                                  onChange={(e) => updateColumn(activeSheetIndex, cIdx, { type: e.target.value })}
                                  className="w-full bg-transparent border-none text-slate-600 focus:ring-0 focus:outline-none cursor-pointer"
                                >
                                  {dataTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => updateColumn(activeSheetIndex, cIdx, { required: !col.required })}
                                  className={`h-5 w-5 rounded border flex items-center justify-center mx-auto transition-colors ${
                                    col.required ? "bg-slate-800 border-slate-800 text-white" : "border-slate-300 text-transparent"
                                  }`}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => removeColumn(activeSheetIndex, cIdx)}
                                  disabled={activeSheet.columns.length <= 1}
                                  className="text-slate-300 hover:text-red-500 p-1 rounded hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="p-4 border-t border-slate-100">
                        <button
                          onClick={() => addColumn(activeSheetIndex)}
                          className="text-sm font-medium text-slate-500 hover:text-slate-800 flex items-center gap-2 py-1 transition-colors"
                          style={{ color: activeColor }}
                        >
                          <Plus className="h-4 w-4" /> Tambah Kolom
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center">
                      <Database className="h-12 w-12 text-slate-200 mb-3" />
                      <p>Menu ini tidak memiliki form input atau data sheet.</p>
                      <p className="text-sm mt-1">Aktifkan operasi Create/Update/Delete untuk memunculkan konfigurasi tabel.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ─── ADVANCED SETTINGS MODAL ─── */}
      {showAdvancedSettings && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-surface-900 h-full border-l border-surface-800 flex flex-col shadow-2xl animate-slide-in-right">
            <div className="p-6 border-b border-surface-800 flex items-center justify-between bg-surface-950">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><Settings className="h-5 w-5"/> Pengaturan Lanjutan</h2>
              <button onClick={() => setShowAdvancedSettings(false)} className="p-2 text-surface-400 hover:text-white rounded-lg hover:bg-surface-800 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-8 custom-scrollbar">
              {/* Auth Settings */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-brand-400 uppercase tracking-wider flex items-center gap-2"><Lock className="h-4 w-4"/> Keamanan & Login</h3>
                <div className="grid gap-3">
                  <button
                    onClick={() => updateData({ hasLogin: false })}
                    className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${!data.hasLogin ? "border-brand-500 bg-brand-500/10" : "border-surface-700 bg-surface-800/50 hover:border-surface-600"}`}
                  >
                    <Unlock className={`h-5 w-5 ${!data.hasLogin ? "text-brand-400" : "text-surface-500"}`} />
                    <div>
                      <div className="text-sm font-semibold text-white">Publik (Tanpa Login)</div>
                      <div className="text-xs text-surface-400 mt-0.5">Semua orang yang punya link bisa mengakses aplikasi.</div>
                    </div>
                  </button>
                  <button
                    onClick={() => updateData({ hasLogin: true })}
                    className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${data.hasLogin ? "border-brand-500 bg-brand-500/10" : "border-surface-700 bg-surface-800/50 hover:border-surface-600"}`}
                  >
                    <Lock className={`h-5 w-5 ${data.hasLogin ? "text-brand-400" : "text-surface-500"}`} />
                    <div>
                      <div className="text-sm font-semibold text-white">Privat (Halaman Login)</div>
                      <div className="text-xs text-surface-400 mt-0.5">Wajib login username/password yang diambil dari Sheet.</div>
                    </div>
                  </button>
                </div>
                {data.hasLogin && (
                  <div className="mt-3 pl-4 border-l-2 border-brand-500/50 space-y-2 animate-fade-in">
                    <label className="block text-xs font-medium text-surface-300">Daftar Role / Hak Akses (Pisahkan dengan koma)</label>
                    <input
                      type="text"
                      placeholder="Admin, Guru, Siswa"
                      value={data.loginAccess}
                      onChange={(e) => updateData({ loginAccess: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg bg-surface-800 border border-surface-700 text-white focus:border-brand-500 text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Data & Scope */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-brand-400 uppercase tracking-wider flex items-center gap-2"><Database className="h-4 w-4"/> Infrastruktur</h3>
                <div>
                  <label className="block text-xs font-medium text-surface-300 mb-2">Sumber Data</label>
                  <select
                    value={data.dataSource}
                    onChange={(e) => updateData({ dataSource: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg bg-surface-800 border border-surface-700 text-white focus:border-brand-500 text-sm"
                  >
                    {dataSourceOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-300 mb-2">Skala Pengguna</label>
                  <select
                    value={data.userType}
                    onChange={(e) => updateData({ userType: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg bg-surface-800 border border-surface-700 text-white focus:border-brand-500 text-sm"
                  >
                    {userTypeOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              {/* Extra Features */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-brand-400 uppercase tracking-wider flex items-center gap-2"><Sparkles className="h-4 w-4"/> Fitur Tambahan</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => updateData({ hasEmailNotif: !data.hasEmailNotif })}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${data.hasEmailNotif ? "border-brand-500 bg-brand-500/10 text-white" : "border-surface-700 bg-surface-800/30 text-surface-400 hover:bg-surface-800"}`}
                  >
                    <Mail className="h-4 w-4" />
                    <span className="text-sm font-medium flex-1">Notifikasi Email Otomatis</span>
                    <div className={`h-4 w-4 rounded-sm border flex items-center justify-center ${data.hasEmailNotif ? "bg-brand-500 border-brand-500" : "border-surface-600"}`}>
                      {data.hasEmailNotif && <Check className="h-3 w-3 text-white" />}
                    </div>
                  </button>
                  {data.hasEmailNotif && (
                    <input
                      type="text"
                      placeholder="Contoh: Saat data baru ditambahkan"
                      value={data.emailTrigger}
                      onChange={(e) => updateData({ emailTrigger: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg bg-surface-800 border border-surface-700 text-white focus:border-brand-500 text-sm animate-fade-in"
                    />
                  )}

                  <div className="w-full h-px bg-surface-800 my-2" />
                  
                  {extraFeaturesList.map((feat) => (
                    <button
                      key={feat}
                      onClick={() => {
                        const ef = data.extraFeatures.includes(feat)
                          ? data.extraFeatures.filter((f) => f !== feat)
                          : [...data.extraFeatures, feat];
                        updateData({ extraFeatures: ef });
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${data.extraFeatures.includes(feat) ? "border-brand-500 bg-brand-500/10 text-white" : "border-surface-700 bg-surface-800/30 text-surface-400 hover:bg-surface-800"}`}
                    >
                      <span className="text-sm font-medium flex-1">{feat}</span>
                      <div className={`h-4 w-4 rounded-sm border flex items-center justify-center ${data.extraFeatures.includes(feat) ? "bg-brand-500 border-brand-500" : "border-surface-600"}`}>
                        {data.extraFeatures.includes(feat) && <Check className="h-3 w-3 text-white" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-surface-800 bg-surface-950">
              <button onClick={() => setShowAdvancedSettings(false)} className="btn-primary w-full py-3">Simpan Pengaturan</button>
            </div>
          </div>
        </div>
      )}

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
