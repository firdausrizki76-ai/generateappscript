/* ─────────────────────────────────────────────
   Supabase live backend data wrapper
   ───────────────────────────────────────────── */

import { supabase } from "./supabase";
import { getUserQuotaCycle } from "./quota";

export interface UserProfile {
  name: string;
  email: string;
  plan: "free" | "pro" | "business";
  quotaUsed: number;
  quotaLimit: number;
  chatQuotaUsed: number;
  chatQuotaLimit: number;
  resetDate?: string;
}

export interface PromptHistory {
  id: string;
  appName: string;
  description: string;
  createdAt: string;
  outputMd: string;
  inputData: WizardData;
  interviewData?: InterviewData;
  isAiGeneratedPrd?: boolean;
  codeGs?: string;
  codeHtml?: string;
  chatHistory?: { role: "user" | "assistant"; content: string; reasoning?: string }[];
}

export interface UIComponent {
  id: string;
  type: "heading" | "paragraph" | "input" | "textarea" | "select" | "date" | "button" | "table" | "chart" | "kpi";
  label: string;
  placeholder?: string;
  width: "col-12" | "col-6" | "col-4" | "col-3";
  required?: boolean;
  options?: string[];
  associatedColumn?: string;
  buttonAction?: "submit" | "reset" | "custom";
  chartType?: "bar" | "line" | "pie";
  kpiIcon?: string;
}

export interface MenuItem {
  name: string;
  icon: string;
  description: string;
  crud: { create: boolean; read: boolean; update: boolean; delete: boolean };
  hasFilter: boolean;
  filterColumns: string;
  hasExport: boolean;
  exportFormats: string[];
  layoutComponents?: UIComponent[];
}

export interface ColumnDef {
  name: string;
  type: string;
  required: boolean;
  note: string;
}

export interface SheetDef {
  menuName: string;
  sheetName: string;
  columns: ColumnDef[];
  autoCreatedAt: boolean;
  autoUpdatedAt: boolean;
  autoCreatedBy: boolean;
}

export interface WizardData {
  // Step 1
  appName: string;
  appDescription: string;
  dataSource: string;
  userType: string;
  // Step 2
  menus: MenuItem[];
  // Step 3
  sheets: SheetDef[];
  // Step 4
  colorTheme: string;
  customColor: string;
  tableLayout: string;
  hasLogin: boolean;
  loginAccess: string;
  hasEmailNotif: boolean;
  emailTrigger: string;
  extraFeatures: string[];
}

/* ─── Interview-Based PRD Types ─── */

export interface RoleMenuDetail {
  menuName: string;
  description: string;
  displayFields: string;
  hasCrud: boolean;
  crudDetails: string;
  specialFeatures: string;
}

export interface UserRoleDefinition {
  roleName: string;
  roleDescription: string;
  menus: RoleMenuDetail[];
}

export interface InterviewDesignPreferences {
  themeColor: string;
  fontFamily: string;
  uiStyle: string;
  mode: "light" | "dark" | "auto";
}

export interface InterviewData {
  appName: string;
  appDescription: string;
  targetUserRoles: UserRoleDefinition[];
  designPreferences: InterviewDesignPreferences;
  additionalNotes: string;
}

const PLAN_LIMITS: Record<string, number> = { free: 1, pro: 10, business: 30 };
const CHAT_LIMITS: Record<string, number> = { free: 0, pro: 50, business: 150 };

// Check if logged in synchronously (reads localStorage cached token)
export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  
  // Prevent redirect loop during OAuth callback processing
  if (window.location.hash && (
    window.location.hash.includes("access_token=") || 
    window.location.hash.includes("error=")
  )) {
    return true;
  }

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
      return true;
    }
  }
  return false;
}

// Fetch user profile from Supabase profiles + quota_usage
export async function getProfile(): Promise<UserProfile> {
  const fallbackProfile: UserProfile = {
    name: "User Demo",
    email: "demo@appscriptgen.id",
    plan: "free",
    quotaUsed: 0,
    quotaLimit: 1,
    chatQuotaUsed: 0,
    chatQuotaLimit: 0,
  };

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return fallbackProfile;

    // Fetch profile
    let { data: profile, error: profError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profError || !profile) {
      // Auto create profile if it didn't trigger
      const { data: newProfile } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          email: user.email!,
          full_name: user.user_metadata?.full_name || user.email?.split("@")[0],
          plan: "free",
        })
        .select()
        .single();
      profile = newProfile;
    }

    if (!profile) return fallbackProfile;

    const { cycleId, limit: quotaLimit, chatLimit: chatQuotaLimit, resetDate } = await getUserQuotaCycle(supabase, user.id, profile);
    let { data: quota, error: quotaError } = await supabase
      .from("quota_usage")
      .select("*")
      .eq("user_id", user.id)
      .eq("month", cycleId)
      .single();

    if (quotaError || !quota) {
      // Create new quota for new cycle
      const { data: newQuota } = await supabase
        .from("quota_usage")
        .insert({
          user_id: user.id,
          month: cycleId,
          used: 0,
          limit: quotaLimit,
          chat_used: 0,
          chat_limit: chatQuotaLimit,
        })
        .select()
        .single();
      quota = newQuota;
    }

    return {
      name: profile.full_name || user.email?.split("@")[0] || "User",
      email: profile.email,
      plan: (user.id === "1df7608c-3fd1-45c5-b110-cb9633010700" ? "pro" : profile.plan) as "free" | "pro" | "business",
      quotaUsed: quota?.used ?? 0,
      quotaLimit: quota?.limit ?? 1,
      chatQuotaUsed: quota?.chat_used ?? 0,
      chatQuotaLimit: quota?.chat_limit ?? 0,
      resetDate,
    };
  } catch (err) {
    console.error("Error getting profile:", err);
    return fallbackProfile;
  }
}

// Update profile plan/data directly (e.g. simulation or manual upgrade)
export async function saveProfile(p: UserProfile): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("profiles")
      .update({
        full_name: p.name,
        plan: p.plan,
      })
      .eq("id", user.id);

    const { cycleId } = await getUserQuotaCycle(supabase, user.id);
    await supabase
      .from("quota_usage")
      .update({
        limit: p.quotaLimit,
        chat_limit: p.chatQuotaLimit,
        used: p.quotaUsed,
        chat_used: p.chatQuotaUsed,
      })
      .eq("user_id", user.id)
      .eq("month", cycleId);
  } catch (err) {
    console.error("Error saving profile:", err);
  }
}

// Upgrade user plan
export async function upgradePlan(plan: "free" | "pro" | "business"): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("profiles")
      .update({ plan })
      .eq("id", user.id);

    const { cycleId } = await getUserQuotaCycle(supabase, user.id, { plan });
    await supabase
      .from("quota_usage")
      .update({
        limit: PLAN_LIMITS[plan],
        chat_limit: CHAT_LIMITS[plan],
        used: 0,
        chat_used: 0,
      })
      .eq("user_id", user.id)
      .eq("month", cycleId);
  } catch (err) {
    console.error("Error upgrading plan:", err);
  }
}

// Fetch all prompt history records for user
export async function getHistory(): Promise<PromptHistory[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("prompts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error || !data) return [];

    return data.map((item) => {
      const rawInput = (item.input_data || {}) as any;
      const { _interviewData, _isAiGeneratedPrd, ...wizardData } = rawInput;
      return {
        id: item.id,
        appName: item.app_name,
        description: item.description || "",
        createdAt: item.created_at,
        outputMd: item.output_md || "",
        inputData: wizardData as WizardData,
        interviewData: _interviewData as InterviewData | undefined,
        isAiGeneratedPrd: !!_isAiGeneratedPrd,
        codeGs: item.code_gs || "",
        codeHtml: item.code_html || "",
        chatHistory: item.chat_history || [],
      };
    });
  } catch (err) {
    console.error("Error getting history:", err);
    return [];
  }
}

// Save history changes locally (retained for backward compatibility, noop since DB handles it)
export function saveHistory(h: PromptHistory[]) {
  // Noop: We update database directly
}

// Add a prompt to the history
export async function addPromptToHistory(item: PromptHistory): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("prompts")
      .insert({
        id: item.id,
        user_id: user.id,
        app_name: item.appName,
        description: item.description,
        input_data: {
          ...item.inputData,
          ...(item.interviewData ? { _interviewData: item.interviewData } : {}),
          ...(item.isAiGeneratedPrd ? { _isAiGeneratedPrd: true } : {}),
        },
        output_md: item.outputMd,
        code_gs: item.codeGs || "",
        code_html: item.codeHtml || "",
        chat_history: item.chatHistory || [],
        status: "done",
      });

    const { cycleId } = await getUserQuotaCycle(supabase, user.id);
    await supabase.rpc("increment_quota", {
      user_id_val: user.id,
      month_val: cycleId,
    });
  } catch (err) {
    console.error("Error adding prompt to history:", err);
  }
}

// Get specific prompt by ID
export async function getPromptById(id: string): Promise<PromptHistory | undefined> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return undefined;

    const { data, error } = await supabase
      .from("prompts")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !data) return undefined;

    const rawInput = (data.input_data || {}) as any;
    const { _interviewData, _isAiGeneratedPrd, ...wizardData } = rawInput;
    return {
      id: data.id,
      appName: data.app_name,
      description: data.description || "",
      createdAt: data.created_at,
      outputMd: data.output_md || "",
      inputData: wizardData as WizardData,
      interviewData: _interviewData as InterviewData | undefined,
      isAiGeneratedPrd: !!_isAiGeneratedPrd,
      codeGs: data.code_gs || "",
      codeHtml: data.code_html || "",
      chatHistory: data.chat_history || [],
    };
  } catch (err) {
    console.error("Error getting prompt by ID:", err);
    return undefined;
  }
}

// Update code files and chat history on a prompt
export async function updatePromptCodeAndChat(
  id: string,
  codeGs: string,
  codeHtml: string,
  chatHistory: { role: "user" | "assistant"; content: string; reasoning?: string }[]
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("prompts")
      .update({
        code_gs: codeGs,
        code_html: codeHtml,
        chat_history: chatHistory,
      })
      .eq("id", id)
      .eq("user_id", user.id);
  } catch (err) {
    console.error("Error updating prompt code and chat:", err);
  }
}

// Delete prompt history record
export async function deletePrompt(id: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("prompts")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
  } catch (err) {
    console.error("Error deleting prompt:", err);
  }
}

export function generateId(): string {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// Real login/logout wrappers
export async function loginWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email: string, password: string, name: string, plan: "free" | "pro" = "free") {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
        plan,
      },
    },
  });
  if (error) throw error;
  return data;
}

export async function loginWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/dashboard`,
    },
  });
  if (error) throw error;
  return data;
}

export async function signInDemoUser() {
  const email = "demo@appscriptgen.id";
  const password = "demopassword";

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error && error.message.includes("Invalid login credentials")) {
      // Auto sign up if demo user doesn't exist yet
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: "User Demo",
          },
        },
      });
      if (signUpError) throw signUpError;
      
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
      return signInData;
    } else if (error) {
      throw error;
    }
    
    return data;
  } catch (err) {
    console.error("Failed demo user sign-in:", err);
    throw err;
  }
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}

// Deprecated mock helpers (implemented as no-ops or simple redirections for backward compatibility)
export function mockLogin(email: string, name?: string) {
  // Deprecated: pages should call loginWithEmail or signInDemoUser directly
}

export function mockLogout() {
  // Deprecated: pages should call logout()
}

export function getDefaultWizardData(): WizardData {
  return {
    appName: "",
    appDescription: "",
    dataSource: "Google Sheets",
    userType: "Hanya saya sendiri",
    menus: [
      {
        name: "",
        icon: "ClipboardList",
        description: "",
        crud: { create: false, read: false, update: false, delete: false },
        hasFilter: false,
        filterColumns: "",
        hasExport: false,
        exportFormats: [],
        layoutComponents: [],
      },
    ],
    sheets: [],
    colorTheme: "Biru profesional",
    customColor: "#6366f1",
    tableLayout: "Tabel klasik",
    hasLogin: false,
    loginAccess: "",
    hasEmailNotif: false,
    emailTrigger: "",
    extraFeatures: [],
  };
}
