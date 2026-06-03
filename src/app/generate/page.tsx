"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
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
  type UIComponent,
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
  const [showCrudHelp, setShowCrudHelp] = useState(false);
  const [activeBuilderTab, setActiveBuilderTab] = useState<"canvas" | "schema">("canvas");
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);

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

  const currentMenuName = data.menus[activeMenuIndex]?.name;
  const currentMenuCrud = data.menus[activeMenuIndex]?.crud;
  
  useEffect(() => {
    const activeMenu = data.menus[activeMenuIndex];
    if (activeMenu && (!activeMenu.layoutComponents || activeMenu.layoutComponents.length === 0)) {
      const list: UIComponent[] = [];
      list.push({
        id: "heading_" + generateId().slice(0, 4),
        type: "heading",
        label: activeMenu.name || "Judul Halaman",
        width: "col-12",
      });
      if (activeMenu.crud.read) {
        list.push({
          id: "table_" + generateId().slice(0, 4),
          type: "table",
          label: "Tabel Data " + (activeMenu.name || ""),
          width: "col-12",
        });
      }
      const sheet = data.sheets.find(s => s.menuName === activeMenu.name);
      if (sheet && (activeMenu.crud.create || activeMenu.crud.update)) {
        sheet.columns.forEach((col, idx) => {
          list.push({
            id: `input_${generateId().slice(0, 4)}`,
            type: col.type === "Tanggal" ? "date" : col.type === "Pilihan" ? "select" : col.type === "Teks" && col.name.toLowerCase().includes("alamat") ? "textarea" : "input",
            label: col.name,
            placeholder: "Masukkan " + col.name,
            width: "col-6",
            required: col.required,
            associatedColumn: col.name,
          });
        });
        list.push({
          id: "btn_" + generateId().slice(0, 4),
          type: "button",
          label: "Simpan Data",
          width: "col-12",
          buttonAction: "submit",
        });
      }
      updateMenu(activeMenuIndex, { layoutComponents: list });
    }
  }, [activeMenuIndex, currentMenuName, currentMenuCrud?.create, currentMenuCrud?.read, currentMenuCrud?.update, currentMenuCrud?.delete]);

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

  const syncSheetColumnsWithLayout = (menuName: string, components: UIComponent[], sheets: SheetDef[]): SheetDef[] => {
    const sIdx = sheets.findIndex(s => s.menuName === menuName);
    if (sIdx === -1) return sheets;

    const nextSheets = [...sheets];
    const sheet = nextSheets[sIdx];

    // Collect input columns
    const inputComponents = components.filter(c => ["input", "textarea", "select", "date"].includes(c.type));
    
    // Build column defs
    const columnDefs = inputComponents.map(c => {
      const colName = c.associatedColumn || c.label || "Kolom Baru";
      let colType = "Teks";
      if (c.type === "date") colType = "Tanggal";
      else if (c.type === "select") colType = "Pilihan";
      
      // Check if column already exists in current sheet to preserve notes
      const existingCol = sheet.columns.find(col => col.name === colName);
      return {
        name: colName,
        type: colType,
        required: !!c.required,
        note: existingCol ? existingCol.note : "",
      };
    });

    // Ensure we have at least one column
    if (columnDefs.length === 0) {
      columnDefs.push({ name: "Nama", type: "Teks", required: true, note: "" });
    }

    nextSheets[sIdx] = {
      ...sheet,
      columns: columnDefs
    };

    return nextSheets;
  };

  const updateMenuComponents = (idx: number, components: UIComponent[]) => {
    setData((prev) => {
      const menus = [...prev.menus];
      menus[idx] = { ...menus[idx], layoutComponents: components };
      
      // Sync sheet columns
      const sheets = syncSheetColumnsWithLayout(menus[idx].name, components, prev.sheets);
      return { ...prev, menus, sheets };
    });
  };

  const addUIComponent = (type: UIComponent["type"]) => {
    const activeMenu = data.menus[activeMenuIndex];
    if (!activeMenu) return;
    
    const newComp: UIComponent = {
      id: `${type}_${generateId().slice(0, 4)}`,
      type,
      label: type.charAt(0).toUpperCase() + type.slice(1) + " Baru",
      width: "col-12",
      placeholder: ["input", "textarea"].includes(type) ? "Masukkan nilai..." : undefined,
      options: type === "select" ? ["Pilihan 1", "Pilihan 2"] : undefined,
      required: ["input", "textarea", "select", "date"].includes(type) ? false : undefined,
      associatedColumn: ["input", "textarea", "select", "date"].includes(type) ? "kolom_baru" : undefined,
      buttonAction: type === "button" ? "custom" : undefined,
      chartType: type === "chart" ? "bar" : undefined,
    };
    
    const currentList = activeMenu.layoutComponents || [];
    const nextList = [...currentList, newComp];
    updateMenuComponents(activeMenuIndex, nextList);
    setSelectedComponentId(newComp.id);
  };

  const moveUIComponent = (idx: number, direction: "up" | "down") => {
    const activeMenu = data.menus[activeMenuIndex];
    if (!activeMenu) return;
    
    const list = [...(activeMenu.layoutComponents || [])];
    if (direction === "up" && idx > 0) {
      const temp = list[idx];
      list[idx] = list[idx - 1];
      list[idx - 1] = temp;
    } else if (direction === "down" && idx < list.length - 1) {
      const temp = list[idx];
      list[idx] = list[idx + 1];
      list[idx + 1] = temp;
    }
    updateMenuComponents(activeMenuIndex, list);
  };

  const deleteUIComponent = (id: string) => {
    const activeMenu = data.menus[activeMenuIndex];
    if (!activeMenu) return;
    
    const list = (activeMenu.layoutComponents || []).filter(c => c.id !== id);
    updateMenuComponents(activeMenuIndex, list);
    if (selectedComponentId === id) setSelectedComponentId(null);
  };

  const updateUIComponentProps = (id: string, partial: Partial<UIComponent>) => {
    const activeMenu = data.menus[activeMenuIndex];
    if (!activeMenu) return;
    
    const list = (activeMenu.layoutComponents || []).map(c => c.id === id ? { ...c, ...partial } : c);
    updateMenuComponents(activeMenuIndex, list);
  };

  const addMenu = () => {
    if (data.menus.length >= 10) return;
    setData((prev) => {
      const newMenuName = `Menu ${prev.menus.length + 1}`;
      const newMenu: MenuItem = {
        name: newMenuName,
        icon: "ClipboardList",
        description: "Deskripsi menu baru",
        crud: { create: false, read: false, update: false, delete: false },
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
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative group">
                      <button className="h-10 w-10 rounded-lg border border-slate-200 bg-white shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors">
                        {renderMenuIcon(activeMenu.icon, "h-5 w-5")}
                      </button>
                      <div className="absolute right-0 top-10 pt-2 w-64 z-50 hidden group-hover:block">
                        <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-2 grid grid-cols-4 gap-1">
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
              <div className="p-4 sm:p-8 flex-1 flex flex-col gap-6">
                
                {/* Menu Description */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                  <label className="block text-sm font-bold text-slate-800 mb-2 font-display flex items-center gap-2">
                    <FileEdit className="h-4 w-4 text-brand-500" /> Deskripsi Menu
                    <span className="text-slate-400 font-normal text-xs ml-1">(Jelaskan sedetail mungkin fungsi dan relasi data untuk hasil AI maksimal)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={activeMenu.description}
                    onChange={(e) => updateMenu(activeMenuIndex, { description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors resize-none placeholder-slate-400"
                    placeholder="Contoh: Halaman ini digunakan untuk menginput kehadiran harian siswa. Pilihan nama otomatis terhubung dengan dropdown dinamis dari sheet Data Siswa..."
                  />
                </div>

                {/* Tab Switcher */}
                <div className="flex border-b border-slate-200 gap-6 mb-4">
                  <button
                    onClick={() => setActiveBuilderTab("canvas")}
                    className={`pb-3 font-semibold text-sm transition-all border-b-2 px-1 cursor-pointer ${
                      activeBuilderTab === "canvas"
                        ? "border-slate-900 text-slate-900 font-bold"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    🎨 Desainer Tampilan (Visual Canvas)
                  </button>
                  <button
                    onClick={() => setActiveBuilderTab("schema")}
                    className={`pb-3 font-semibold text-sm transition-all border-b-2 px-1 cursor-pointer ${
                      activeBuilderTab === "schema"
                        ? "border-slate-900 text-slate-900 font-bold"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    📊 Struktur Database (Spreadsheet)
                  </button>
                </div>

                {activeBuilderTab === "canvas" && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* Left Column: UI Components Toolbox */}
                    <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Komponen UI</div>
                      <div className="grid grid-cols-1 gap-2">
                        {[
                          { type: "heading", label: "Heading / Judul", icon: FileText },
                          { type: "paragraph", label: "Paragraph Teks", icon: FileEdit },
                          { type: "input", label: "Text Input", icon: Plus },
                          { type: "textarea", label: "Textarea", icon: FileEdit },
                          { type: "select", label: "Dropdown Select", icon: ChevronDown },
                          { type: "date", label: "Date Picker", icon: Calendar },
                          { type: "button", label: "Tombol / Button", icon: Check },
                          { type: "table", label: "Tabel Data", icon: ClipboardList },
                          { type: "chart", label: "Grafik Data", icon: BarChart3 },
                          { type: "kpi", label: "KPI / Stat Card", icon: TrendingUp },
                        ].map((c) => (
                          <button
                            key={c.type}
                            onClick={() => addUIComponent(c.type as UIComponent["type"])}
                            className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 hover:border-slate-300 hover:bg-slate-50 text-left transition-all text-xs font-semibold text-slate-700 w-full cursor-pointer"
                          >
                            <div className="h-7 w-7 rounded bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                              <c.icon className="h-4 w-4" />
                            </div>
                            <span>{c.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Middle Column: Canvas Preview */}
                    <div className="lg:col-span-6 space-y-4 min-h-[400px] p-4 bg-slate-100/50 rounded-2xl border border-slate-200 border-dashed">
                      {(!activeMenu.layoutComponents || activeMenu.layoutComponents.length === 0) ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 gap-3">
                          <Palette className="h-10 w-10 text-slate-300 animate-pulse" />
                          <div className="text-sm font-semibold">Canvas Kosong</div>
                          <div className="text-xs">Klik komponen di sebelah kiri untuk mulai mendesain tampilan halaman ini.</div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-12 gap-3">
                          {(activeMenu.layoutComponents || []).map((comp, idx) => {
                            const isSelected = selectedComponentId === comp.id;
                            return (
                              <div
                                key={comp.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedComponentId(comp.id);
                                }}
                                className={`relative group p-4 bg-white rounded-xl border transition-all cursor-pointer ${
                                  comp.width || "col-12"
                                } ${
                                  isSelected
                                    ? "border-brand-500 ring-2 ring-brand-500/20 shadow-md scale-[1.01]"
                                    : "border-slate-200 hover:border-slate-400 shadow-sm"
                                }`}
                              >
                                {/* Drag/Hover Actions Overlay */}
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center bg-slate-900/90 text-white rounded-lg p-0.5 shadow-lg z-10 gap-0.5">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      moveUIComponent(idx, "up");
                                    }}
                                    disabled={idx === 0}
                                    className="p-1 rounded hover:bg-white/20 disabled:opacity-20 cursor-pointer"
                                    title="Pindahkan Ke Atas"
                                  >
                                    <ChevronUp className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      moveUIComponent(idx, "down");
                                    }}
                                    disabled={idx === (activeMenu.layoutComponents || []).length - 1}
                                    className="p-1 rounded hover:bg-white/20 disabled:opacity-20 cursor-pointer"
                                    title="Pindahkan Ke Bawah"
                                  >
                                    <ChevronDown className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteUIComponent(comp.id);
                                    }}
                                    className="p-1 rounded hover:bg-red-500/30 text-red-400 cursor-pointer"
                                    title="Hapus Elemen"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>

                                {/* Component Layout Representation */}
                                <div className="space-y-1.5 pointer-events-none">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-[9px] uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-bold">
                                      {comp.type}
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-medium">
                                      {comp.width === "col-12" ? "Lebar Penuh" : comp.width === "col-6" ? "Setengah" : comp.width === "col-4" ? "1/3 Grid" : "1/4 Grid"}
                                    </span>
                                  </div>

                                  {comp.type === "heading" && (
                                    <h4 className="text-base font-bold text-slate-800">{comp.label}</h4>
                                  )}

                                  {comp.type === "paragraph" && (
                                    <p className="text-xs text-slate-500 leading-relaxed">{comp.label}</p>
                                  )}

                                  {["input", "textarea", "select", "date"].includes(comp.type) && (
                                    <div className="space-y-1 w-full">
                                      <label className="block text-[11px] font-bold text-slate-700">
                                        {comp.label}{comp.required && <span className="text-red-500"> *</span>}
                                      </label>
                                      <div className="bg-slate-50 border border-slate-200 text-slate-400 rounded-lg p-2 text-xs truncate">
                                        {comp.placeholder || `Input ${comp.type}...`}
                                      </div>
                                      {comp.associatedColumn && (
                                        <div className="text-[9px] text-brand-600 font-semibold bg-brand-50/50 px-1.5 py-0.5 rounded w-max">
                                          Database: {comp.associatedColumn}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {comp.type === "button" && (
                                    <div className="w-full text-center py-2 rounded-lg text-xs font-bold text-white shadow-sm" style={{ backgroundColor: activeColor }}>
                                      {comp.label}
                                    </div>
                                  )}

                                  {comp.type === "table" && (
                                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50 w-full">
                                      <div className="bg-slate-100 p-2 text-[10px] font-bold text-slate-600 border-b border-slate-200">
                                        {comp.label}
                                      </div>
                                      <div className="p-3 text-[10px] text-slate-400 text-center italic">
                                        [Tabel Data]
                                      </div>
                                    </div>
                                  )}

                                  {comp.type === "chart" && (
                                    <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 flex items-center gap-3 w-full">
                                      <BarChart3 className="h-6 w-6 text-slate-400" />
                                      <div>
                                        <div className="text-xs font-bold text-slate-700">{comp.label}</div>
                                        <div className="text-[9px] text-slate-400 capitalize">Tipe: {comp.chartType || "bar"}</div>
                                      </div>
                                    </div>
                                  )}

                                  {comp.type === "kpi" && (
                                    <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 flex items-center gap-3 w-full">
                                      <TrendingUp className="h-6 w-6 text-slate-400" />
                                      <div>
                                        <div className="text-[10px] uppercase font-bold text-slate-400">{comp.label}</div>
                                        <div className="text-lg font-black text-slate-700">-</div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Right Column: Component Properties Inspector */}
                    <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4 sticky top-4">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Properties Inspector</div>
                      {selectedComponentId ? (
                        (() => {
                          const comp = (activeMenu.layoutComponents || []).find((c) => c.id === selectedComponentId);
                          if (!comp) return <div className="text-xs text-slate-400">Pilih komponen di canvas untuk diedit.</div>;

                          return (
                            <div className="space-y-4 animate-fade-in">
                              <div className="pb-3 border-b border-slate-100 flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-800 uppercase">{comp.type} Properties</span>
                                <button
                                  onClick={() => deleteUIComponent(comp.id)}
                                  className="text-red-500 hover:bg-red-50 p-1 rounded cursor-pointer"
                                  title="Hapus Elemen"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>

                              {/* Label/Title */}
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Label / Judul</label>
                                <input
                                  type="text"
                                  value={comp.label}
                                  onChange={(e) => updateUIComponentProps(comp.id, { label: e.target.value })}
                                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                                />
                              </div>

                              {/* Placeholder */}
                              {["input", "textarea"].includes(comp.type) && (
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Placeholder</label>
                                  <input
                                    type="text"
                                    value={comp.placeholder || ""}
                                    onChange={(e) => updateUIComponentProps(comp.id, { placeholder: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                                  />
                                </div>
                              )}

                              {/* Width selection */}
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Lebar Elemen (Grid)</label>
                                <select
                                  value={comp.width}
                                  onChange={(e) => updateUIComponentProps(comp.id, { width: e.target.value as any })}
                                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white"
                                >
                                  <option value="col-12">Lebar Penuh (100%)</option>
                                  <option value="col-6">Setengah (50%)</option>
                                  <option value="col-4">1/3 Grid (33%)</option>
                                  <option value="col-3">1/4 Grid (25%)</option>
                                </select>
                              </div>

                              {/* Column binding for inputs */}
                              {["input", "textarea", "select", "date"].includes(comp.type) && (
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
                                    <Database className="h-3.5 w-3.5 text-slate-400" /> Hubungkan ke Kolom Database
                                  </label>
                                  <input
                                    type="text"
                                    value={comp.associatedColumn || ""}
                                    onChange={(e) => updateUIComponentProps(comp.id, { associatedColumn: e.target.value.trim() })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                                    placeholder="nama_kolom (huruf kecil & tanpa spasi)"
                                  />
                                  <p className="text-[9px] text-slate-400 mt-1">Sistem akan menyinkronkan kolom Spreadsheet sesuai nama ini.</p>
                                </div>
                              )}

                              {/* Required toggle */}
                              {["input", "textarea", "select", "date"].includes(comp.type) && (
                                <label className="flex items-center gap-2 cursor-pointer pt-1">
                                  <input
                                    type="checkbox"
                                    checked={!!comp.required}
                                    onChange={(e) => updateUIComponentProps(comp.id, { required: e.target.checked })}
                                    className="h-4.5 w-4.5 rounded border-slate-300 cursor-pointer"
                                  />
                                  <span className="text-[11px] font-semibold text-slate-600">Wajib Diisi (Required)</span>
                                </label>
                              )}

                              {/* Options editing for dropdown select */}
                              {comp.type === "select" && (
                                <div className="space-y-2">
                                  <label className="block text-[11px] font-semibold text-slate-600">Pilihan Dropdown</label>
                                  <div className="space-y-1">
                                    {(comp.options || []).map((opt, oIdx) => (
                                      <div key={oIdx} className="flex gap-1 items-center">
                                        <input
                                          type="text"
                                          value={opt}
                                          onChange={(e) => {
                                            const opts = [...(comp.options || [])];
                                            opts[oIdx] = e.target.value;
                                            updateUIComponentProps(comp.id, { options: opts });
                                          }}
                                          className="flex-1 px-2 py-1 border border-slate-200 rounded text-xs"
                                        />
                                        <button
                                          onClick={() => {
                                            const opts = (comp.options || []).filter((_, i) => i !== oIdx);
                                            updateUIComponentProps(comp.id, { options: opts });
                                          }}
                                          className="text-red-500 hover:bg-red-50 p-1 rounded cursor-pointer"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      </div>
                                    ))}
                                    <button
                                      onClick={() => {
                                        const opts = [...(comp.options || []), `Pilihan ${(comp.options || []).length + 1}`];
                                        updateUIComponentProps(comp.id, { options: opts });
                                      }}
                                      className="text-xs text-brand-600 font-bold hover:underline pt-1 flex items-center gap-1 cursor-pointer"
                                    >
                                      <Plus className="h-3 w-3" /> Tambah Pilihan
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Button Actions */}
                              {comp.type === "button" && (
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Aksi Tombol</label>
                                  <select
                                    value={comp.buttonAction}
                                    onChange={(e) => updateUIComponentProps(comp.id, { buttonAction: e.target.value as any })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white"
                                  >
                                    <option value="submit">Kirim Form (Submit)</option>
                                    <option value="reset">Kosongkan Form (Reset)</option>
                                    <option value="custom">Aksi Kustom (Custom)</option>
                                  </select>
                                </div>
                              )}

                              {/* Chart Type */}
                              {comp.type === "chart" && (
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tipe Grafik</label>
                                  <select
                                    value={comp.chartType}
                                    onChange={(e) => updateUIComponentProps(comp.id, { chartType: e.target.value as any })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white"
                                  >
                                    <option value="bar">Bar Chart (Batang)</option>
                                    <option value="line">Line Chart (Garis)</option>
                                    <option value="pie">Pie Chart (Lingkaran)</option>
                                  </select>
                                </div>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        <div className="text-xs text-slate-400 py-4 text-center">
                          Pilih komponen di canvas untuk mulai mengedit properti detailnya.
                        </div>
                      )}
                    </div>

                  </div>
                )}

                {activeBuilderTab === "schema" && (
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col w-full">
                    {/* CRUD Toggle Editor inside the table header */}
                    <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Database className="h-4 w-4 text-slate-400" /> 
                        <span className="font-medium">Struktur Kolom Data</span>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1.5">
                        <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium tracking-wide flex items-center gap-1.5">
                          <span>* Izin Akses (Create, Read, Update, Delete)</span>
                          <button onClick={() => setShowCrudHelp(true)} className="h-4 w-4 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center hover:bg-brand-100 hover:text-brand-600 transition-colors cursor-pointer" title="Penjelasan CRUD">?</button>
                        </div>
                        <div className="flex bg-white rounded-xl p-1.5 border border-slate-200 shadow-sm gap-2">
                          {(["create", "read", "update", "delete"] as const).map((op) => (
                            <button
                              key={op}
                              onClick={() => updateMenu(activeMenuIndex, { crud: { ...activeMenu.crud, [op]: !activeMenu.crud[op] } })}
                              className={`px-3.5 py-2 rounded-lg text-xs font-semibold capitalize transition-all flex items-center gap-2 cursor-pointer ${
                                activeMenu.crud[op]
                                  ? "text-white shadow-md scale-[1.02]"
                                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                              }`}
                              style={{
                                backgroundColor: activeMenu.crud[op] ? activeColor : undefined,
                              }}
                            >
                              {op === "create" && <Plus className="h-3.5 w-3.5" />}
                              {op === "read" && <Eye className="h-3.5 w-3.5" />}
                              {op === "update" && <RefreshCw className="h-3.5 w-3.5" />}
                              {op === "delete" && <Trash2 className="h-3.5 w-3.5" />}
                              {op}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {activeSheet ? (
                      <div className="p-4 bg-slate-50/50">
                        <div className="flex overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm pb-1 custom-scrollbar">
                          {/* Auto Columns Preview */}
                          {activeSheet.autoCreatedAt && (
                            <div className="shrink-0 w-44 border-r border-slate-200 bg-slate-50/70 select-none">
                              <div className="p-3 border-b border-slate-200 font-semibold text-sm flex items-center gap-1.5 text-slate-500 bg-slate-100/50">
                                <Lock className="h-3.5 w-3.5 text-slate-400"/> createdAt
                              </div>
                              <div className="px-3 py-2 text-xs text-slate-400 border-b border-slate-100 flex items-center justify-between">
                                <span>Tipe:</span> <span>Tanggal</span>
                              </div>
                              <div className="px-3 py-2 text-xs text-slate-400 border-b border-slate-100 flex items-center justify-between">
                                <span>Wajib:</span> <Check className="h-3 w-3" />
                              </div>
                              <div className="p-3 text-xs text-slate-300 italic border-b border-slate-50 bg-white">
                                Data otomatis...
                              </div>
                              <div className="p-3 text-xs text-slate-300 italic bg-white">
                                Data otomatis...
                              </div>
                            </div>
                          )}
                          
                          {/* Editable Columns */}
                          {activeSheet.columns.map((col, cIdx) => (
                            <div key={cIdx} className="shrink-0 w-56 border-r border-slate-200 relative group flex flex-col transition-colors hover:border-slate-300 focus-within:border-brand-300">
                              {/* Header: Nama Kolom */}
                              <div className="p-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between group-hover:bg-slate-100 transition-colors">
                                <input
                                  type="text"
                                  value={col.name}
                                  onChange={(e) => updateColumn(activeSheetIndex, cIdx, { name: e.target.value })}
                                  className="w-full bg-transparent font-semibold text-sm border-none focus:ring-0 p-1 placeholder-slate-400"
                                  placeholder="Nama Kolom"
                                />
                                <button 
                                  onClick={() => removeColumn(activeSheetIndex, cIdx)} 
                                  disabled={activeSheet.columns.length <= 1}
                                  className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors disabled:opacity-0 cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5"/>
                                </button>
                              </div>
                              
                              {/* Tipe Data */}
                              <div className="px-2 py-1.5 border-b border-slate-100 flex items-center justify-between">
                                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold px-1">Tipe</label>
                                <select
                                  value={col.type}
                                  onChange={(e) => updateColumn(activeSheetIndex, cIdx, { type: e.target.value })}
                                  className="text-xs font-medium bg-transparent border-none focus:ring-0 py-1 pl-2 pr-6 text-slate-700 cursor-pointer text-right hover:bg-slate-50 rounded"
                                >
                                  {dataTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                              </div>
                              
                              {/* Wajib Diisi */}
                              <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                                   onClick={() => updateColumn(activeSheetIndex, cIdx, { required: !col.required })}>
                                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold cursor-pointer">Wajib Isi</label>
                                <div className={`h-4 w-4 rounded flex items-center justify-center transition-colors border ${
                                  col.required ? "bg-slate-800 border-slate-800 text-white" : "border-slate-300 text-transparent"
                                }`}>
                                  <Check className="h-3 w-3" />
                                </div>
                              </div>
                              
                              {/* Mock Data Rows */}
                              <div className="p-3 text-xs text-slate-300 italic border-b border-slate-50 bg-white flex-1 flex items-center">
                                Contoh isi data...
                              </div>
                              <div className="p-3 text-xs text-slate-300 italic bg-white flex-1 flex items-center">
                                Contoh isi data...
                              </div>
                            </div>
                          ))}
                          
                          {/* Add Column Button */}
                          <div 
                            className="shrink-0 w-32 bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors cursor-pointer group" 
                            onClick={() => addColumn(activeSheetIndex)}
                          >
                            <div className="text-center flex flex-col items-center gap-2 transition-transform group-hover:scale-105" style={{ color: activeColor }}>
                              <div className="h-10 w-10 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center text-inherit">
                                <Plus className="h-5 w-5" />
                              </div>
                              <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-700">Tambah Kolom</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 bg-slate-50/50 flex-1 flex flex-col justify-center">
                        <div className="max-w-md mx-auto w-full text-center mb-8">
                          <h3 className="text-lg font-bold text-slate-700 font-display mb-2">Tampilan Dashboard / Statis</h3>
                          <p className="text-sm text-slate-500 leading-relaxed">
                            Karena menu ini tidak memiliki izin operasi <b>Create/Update/Delete</b>, tampilan akhirnya akan dirancang sebagai halaman informasi (Dashboard) yang bisa berisi bagan, grafik, atau rangkuman data.
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto w-full opacity-60 hover:opacity-100 transition-opacity duration-300">
                          {/* Mock Chart Box */}
                          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col items-center justify-center h-32 gap-3 hover:shadow-md transition-shadow">
                            <BarChart3 className="h-8 w-8 text-indigo-400" />
                            <div className="h-2 w-16 bg-slate-200 rounded-full"></div>
                          </div>
                          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col items-center justify-center h-32 gap-3 hover:shadow-md transition-shadow">
                            <TrendingUp className="h-8 w-8 text-emerald-400" />
                            <div className="h-2 w-20 bg-slate-200 rounded-full"></div>
                          </div>
                          {/* Mock Large Chart */}
                          <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm h-48 flex flex-col gap-4 hover:shadow-md transition-shadow">
                            <div className="h-3 w-32 bg-slate-200 rounded-full"></div>
                            <div className="flex-1 flex items-end justify-between gap-3 px-4">
                              <div className="w-full bg-blue-100/80 rounded-t-lg h-[40%]"></div>
                              <div className="w-full bg-blue-200/80 rounded-t-lg h-[70%]"></div>
                              <div className="w-full bg-blue-300/80 rounded-t-lg h-[50%]"></div>
                              <div className="w-full bg-blue-400/80 rounded-t-lg h-[90%]"></div>
                              <div className="w-full bg-blue-500/80 rounded-t-lg h-[60%]"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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

      {/* ─── CRUD Help Modal ─── */}
      {showCrudHelp && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-fade-up relative">
            <button onClick={() => setShowCrudHelp(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-colors"><X className="h-5 w-5"/></button>
            <h3 className="text-lg font-bold text-slate-800 mb-2 font-display">Izin Akses Data (CRUD)</h3>
            <p className="text-sm text-slate-600 mb-5 leading-relaxed">CRUD adalah kepanjangan dari standar opsi pengelolaan data di dalam aplikasi. Tentukan apa saja yang pengguna bisa lakukan di menu ini:</p>
            <ul className="space-y-4 text-sm text-slate-600">
              <li className="flex gap-3">
                <div className="font-bold text-brand-600 min-w-[55px] pt-0.5">Create</div> 
                <span>Memungkinkan pengguna untuk menambahkan data baru ke dalam database.</span>
              </li>
              <li className="flex gap-3">
                <div className="font-bold text-brand-600 min-w-[55px] pt-0.5">Read</div> 
                <span>Menampilkan daftar atau tabel data untuk dilihat dan dibaca.</span>
              </li>
              <li className="flex gap-3">
                <div className="font-bold text-brand-600 min-w-[55px] pt-0.5">Update</div> 
                <span>Mengizinkan pengguna mengubah atau mengedit data yang sudah ada.</span>
              </li>
              <li className="flex gap-3">
                <div className="font-bold text-brand-600 min-w-[55px] pt-0.5">Delete</div> 
                <span>Mengizinkan pengguna menghapus data secara permanen.</span>
              </li>
            </ul>
            <div className="mt-5 p-3 bg-blue-50 text-blue-700 rounded-lg text-xs leading-relaxed border border-blue-100">
              <span className="font-semibold">💡 Tips:</span> Jika Anda menonaktifkan <b>Create, Update, dan Delete</b>, menu tersebut otomatis akan dianggap sebagai <b>Dashboard</b> atau Halaman Statis.
            </div>
            <button onClick={() => setShowCrudHelp(false)} className="mt-6 w-full py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors">Saya Mengerti</button>
          </div>
        </div>
      )}

    </div>
  );
}
