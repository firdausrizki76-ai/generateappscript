import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserQuotaCycle } from "@/lib/quota";

export const runtime = 'edge';
export const maxDuration = 60;

// System Skill Prompt — injected as the AI's "expertise module"
function buildSystemSkillPrompt(interviewData: any): string {
  const roles = interviewData.targetUserRoles || [];
  const design = interviewData.designPreferences || {};

  // Build role breakdown
  let roleBreakdown = "";
  for (const role of roles) {
    roleBreakdown += `\n### Role: ${role.roleName}\n`;
    roleBreakdown += `Deskripsi: ${role.roleDescription}\n`;
    roleBreakdown += `Menu yang dimiliki:\n`;
    for (const menu of role.menus || []) {
      roleBreakdown += `- **${menu.menuName}**: ${menu.description}\n`;
      roleBreakdown += `  - Data yang ditampilkan: ${menu.displayFields}\n`;
      roleBreakdown += `  - CRUD: ${menu.hasCrud ? "Ya" : "Tidak"}${menu.hasCrud && menu.crudDetails ? ` — ${menu.crudDetails}` : ""}\n`;
      if (menu.specialFeatures) {
        roleBreakdown += `  - Fitur khusus: ${menu.specialFeatures}\n`;
      }
    }
  }

  return `Anda adalah **Principal Software Architect & Google Apps Script Expert** level senior. Tugas Anda adalah menghasilkan dokumen PRD (Product Requirement Document) / Master Implementation Plan yang **SUPER LENGKAP, PROFESIONAL, dan SANGAT DETAIL** berdasarkan data interview pengguna berikut.

=== DATA INTERVIEW PENGGUNA ===

**Nama Aplikasi:** ${interviewData.appName}
**Deskripsi/Tujuan:** ${interviewData.appDescription}

**Role Pengguna yang Login:**
${roleBreakdown}

**Preferensi Desain:**
- Warna tema: ${design.themeColor || "Biru profesional (#0d6efd)"}
- Font: ${design.fontFamily || "Plus Jakarta Sans & Outfit"}
- Gaya UI: ${design.uiStyle || "Modern & Premium"}
- Mode: ${design.mode || "light"}

${interviewData.additionalNotes ? `**Catatan Tambahan:** ${interviewData.additionalNotes}` : ""}

=== INSTRUKSI OUTPUT ===

Buatkan PRD/Implementation Plan dalam format Markdown yang WAJIB mencakup seluruh bagian berikut:

## 1. Overview & Tujuan Aplikasi
Jelaskan secara ringkas tujuan aplikasi, siapa target penggunanya, dan apa masalah yang dipecahkan.

## 2. Technical Stack
- Platform: Google Apps Script (Web App)
- Data storage: Google Sheets (satu Spreadsheet dengan multi-tab/sheet)
- Frontend: HTML Service (Bootstrap 5 CDN + Google Fonts)
- Backend: GAS server-side functions
- Komunikasi Frontend→Backend: google.script.run (DILARANG menggunakan fetch/axios/XMLHttpRequest)

## 3. Arsitektur Role-Based Access Control (RBAC)
Jelaskan secara rinci mekanisme login, pembagian role, dan akses menu per role. Sertakan tabel matrix role vs menu.

## 4. Google Sheets Database Structure
Untuk SETIAP sheet yang diperlukan, buatkan tabel kolom lengkap dengan:
- Nama kolom, Tipe data, Wajib/Tidak, Keterangan
- Sheet_Users untuk autentikasi (id, username, password, role, nama_lengkap)
- Sheet terpisah per entitas data (misal Sheet_Siswa, Sheet_Guru, Sheet_Absensi, dll)
- Sertakan kolom auto: id (UUID), createdAt, updatedAt, createdBy

## 5. Menu & Features per Role
Untuk SETIAP role:
- Daftar menu yang tersedia
- Detail fitur per menu (CRUD operations, filter, pencarian, export, grafik/chart, KPI cards)
- Alur interaksi pengguna per fitur

## 6. Frontend (index.html) Requirements
- Sidebar navigasi berbasis role
- Multi-page SPA (Single Page Application) dengan switchPage()
- Form input modern dengan validasi
- Tabel data dengan pagination, search, sorting
- Modal CRUD (tambah/edit/hapus dengan konfirmasi)
- Loading overlay & toast notification
- Desain premium: glassmorphism, micro-animations, transisi halus, border tipis, shadow lembut
- Responsive mobile-first

## 7. Backend (code.gs) Requirements  
- doGet() dengan HtmlService
- Fungsi CRUD per entitas: getAll[Entity](), add[Entity](), update[Entity](), delete[Entity]()
- Fungsi login: authenticateUser(username, password)
- Utility: generateUUID(), getCurrentTimestamp()
- Error handling yang baik

## 8. Application Flow Chart (Mermaid)
Buatkan diagram alur aplikasi menggunakan sintaks Mermaid yang menggambarkan:
- Alur login & autentikasi
- Navigasi antar halaman berdasarkan role
- Alur CRUD (Create, Read, Update, Delete) untuk setiap entitas utama
- Interaksi frontend ↔ backend

Format diagram WAJIB menggunakan blok kode Mermaid:
\`\`\`mermaid
flowchart TD
    A[Start] --> B{Login}
    B -->|Admin| C[Dashboard Admin]
    B -->|Pimpinan| D[Dashboard Pimpinan]
    ...dst
\`\`\`

Buatkan MINIMAL 2 diagram Mermaid:
1. **Application Flow** — alur navigasi utama
2. **Data Flow** — alur CRUD dan interaksi data

## 9. Spesifikasi Desain Visual
Detail CSS/styling requirements:
- Warna tema utama dan turunannya
- Typography (heading font, body font)
- Border radius, shadow, spacing standar
- Efek hover, transisi, animasi

## 10. Deployment & Setup Guide
Langkah-langkah deploy aplikasi ke Google Apps Script.

=== ATURAN MUTLAK ===
1. Output HANYA berupa Markdown murni. Jangan tambahkan kata pengantar atau penutup di luar format Markdown.
2. PRD harus SANGAT DETAIL — setiap menu, setiap kolom database, setiap fitur harus dijabarkan.
3. Gunakan tabel Markdown untuk struktur database.
4. Gunakan emoji untuk menandai status fitur (✅, ❌, 🔄).
5. Mermaid diagram WAJIB ada dan WAJIB valid secara sintaks.
6. Bahasa output: Bahasa Indonesia (kecuali istilah teknis).
7. Jangan ada placeholder "TBD" atau "TODO" — semua harus terisi lengkap berdasarkan data interview.`;
}

async function fetchOpenRouterWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 2
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 429 && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      return res;
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
  }
  throw lastError || new Error("Failed after retries");
}

export async function POST(req: Request) {
  try {
    // 1. Auth
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Autentikasi diperlukan. Silakan login kembali." },
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabaseServer = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Sesi tidak valid atau telah berakhir." },
        { status: 401 }
      );
    }

    // 2. Parse body
    const body = await req.json();
    const { interviewData } = body;

    if (!interviewData || !interviewData.appName) {
      return NextResponse.json(
        { success: false, error: "Data interview tidak lengkap." },
        { status: 400 }
      );
    }

    // 3. Check quota
    const { cycleId, limit: quotaLimit } = await getUserQuotaCycle(supabaseServer, user.id);

    let { data: quota, error: quotaError } = await supabaseServer
      .from("quota_usage")
      .select("*")
      .eq("user_id", user.id)
      .eq("month", cycleId)
      .single();

    if (quotaError || !quota) {
      const { data: newQuota, error: createErr } = await supabaseServer
        .from("quota_usage")
        .insert({
          user_id: user.id,
          month: cycleId,
          used: 0,
          limit: quotaLimit,
          chat_used: 0,
          chat_limit: 0,
        })
        .select()
        .single();
      if (createErr || !newQuota) {
        return NextResponse.json(
          { success: false, error: "Gagal memproses kuota pengguna." },
          { status: 500 }
        );
      }
      quota = newQuota;
    }

    if (quota.used >= quota.limit) {
      return NextResponse.json(
        {
          success: false,
          error: `Kuota generate bulanan Anda telah habis (${quota.used}/${quota.limit}). Upgrade ke Pro untuk kuota lebih banyak.`,
        },
        { status: 403 }
      );
    }

    // 4. Call AI
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      // Demo/mock mode
      const mockPrd = generateMockPrd(interviewData);
      return NextResponse.json({
        success: true,
        prdMarkdown: mockPrd,
      });
    }

    const systemPrompt = buildSystemSkillPrompt(interviewData);
    const modelName = process.env.OPENROUTER_MODEL || "deepseek/deepseek-v4-pro";

    const payload = {
      model: modelName,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Buatkan PRD/Master Implementation Plan yang super lengkap untuk aplikasi "${interviewData.appName}". Gunakan semua data interview di atas. Pastikan semua bagian terisi tanpa ada yang kosong atau placeholder.`,
        },
      ],
      temperature: 0.4,
      max_tokens: 6144,
    };

    const res = await fetchOpenRouterWithRetry("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://generateappscript.vercel.app/",
        "X-Title": "AppScript Generator - PRD Engine",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("OpenRouter error:", errText);
      throw new Error(`AI API Error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    let prdMarkdown = data.choices?.[0]?.message?.content || "";

    // Clean markdown code fences if AI wraps the entire response
    prdMarkdown = prdMarkdown.trim();
    if (prdMarkdown.startsWith("```markdown")) {
      prdMarkdown = prdMarkdown.replace(/^```markdown\s*\n?/, "").replace(/\n?```\s*$/, "");
    } else if (prdMarkdown.startsWith("```md")) {
      prdMarkdown = prdMarkdown.replace(/^```md\s*\n?/, "").replace(/\n?```\s*$/, "");
    } else if (prdMarkdown.startsWith("```") && !prdMarkdown.startsWith("```mermaid")) {
      prdMarkdown = prdMarkdown.replace(/^```\s*\n?/, "").replace(/\n?```\s*$/, "");
    }

    return NextResponse.json({
      success: true,
      prdMarkdown: prdMarkdown.trim(),
    });
  } catch (err: any) {
    console.error("PRD Generation Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Terjadi kesalahan saat menghasilkan PRD.",
      },
      { status: 500 }
    );
  }
}

// Mock PRD for when API key is not configured
function generateMockPrd(interviewData: any): string {
  const roles = interviewData.targetUserRoles || [];
  const design = interviewData.designPreferences || {};

  let roleMenuSection = "";
  let dbSection = "";
  let mermaidNodes = "    A[Start / Buka Aplikasi] --> B{Login Page}\n";

  for (const role of roles) {
    const roleId = role.roleName.replace(/\s+/g, "");
    mermaidNodes += `    B -->|${role.roleName}| ${roleId}[Dashboard ${role.roleName}]\n`;

    roleMenuSection += `\n### Role: ${role.roleName}\n`;
    roleMenuSection += `**Deskripsi:** ${role.roleDescription}\n\n`;

    for (const menu of role.menus || []) {
      roleMenuSection += `#### Menu: ${menu.menuName}\n`;
      roleMenuSection += `- **Fungsi:** ${menu.description}\n`;
      roleMenuSection += `- **Data ditampilkan:** ${menu.displayFields}\n`;
      roleMenuSection += `- **CRUD:** ${menu.hasCrud ? "✅ Ya" : "❌ Tidak"}\n`;
      if (menu.specialFeatures) {
        roleMenuSection += `- **Fitur Khusus:** ${menu.specialFeatures}\n`;
      }
      roleMenuSection += "\n";

      const sheetName = `Sheet_${menu.menuName.replace(/\s+/g, "_")}`;
      dbSection += `\n### ${sheetName}\n`;
      dbSection += `Terkait menu: **${menu.menuName}** (Role: ${role.roleName})\n\n`;
      dbSection += `| Kolom | Tipe | Wajib | Keterangan |\n`;
      dbSection += `|-------|------|-------|------------|\n`;
      dbSection += `| id | String (UUID) | Ya | Auto-generate |\n`;
      dbSection += `| ${menu.displayFields.split(",")[0]?.trim() || "nama"} | Teks | Ya | Data utama |\n`;
      dbSection += `| createdAt | Timestamp | Ya | Auto |\n`;
      dbSection += `| updatedAt | Timestamp | Ya | Auto |\n`;
      dbSection += `| createdBy | String | Ya | Auto |\n\n`;

      mermaidNodes += `    ${roleId} --> ${roleId}_${menu.menuName.replace(/\s+/g, "")}[${menu.menuName}]\n`;
    }
  }

  return `# ${interviewData.appName} — Master Implementation Plan

## 1. Overview & Tujuan Aplikasi
${interviewData.appDescription}

> **[MODE DEMO — API KEY KOSONG]**
> PRD ini dihasilkan secara lokal tanpa AI. Untuk PRD lengkap berbasis AI, konfigurasi \`OPENROUTER_API_KEY\` di environment variables.

## 2. Technical Stack
- **Platform:** Google Apps Script (Web App)
- **Data storage:** Google Sheets
- **Frontend:** HTML Service (Bootstrap 5 CDN + Google Fonts: Plus Jakarta Sans & Outfit)
- **Backend:** GAS server-side functions
- **Komunikasi:** google.script.run (async)

## 3. Role-Based Access Control (RBAC)

| Role | Deskripsi | Jumlah Menu |
|------|-----------|-------------|
${roles.map((r: any) => `| ${r.roleName} | ${r.roleDescription} | ${(r.menus || []).length} |`).join("\n")}

## 4. Google Sheets Database Structure

### Sheet_Users
| Kolom | Tipe | Wajib | Keterangan |
|-------|------|-------|------------|
| id | String (UUID) | Ya | Auto-generate |
| username | Teks | Ya | Username login |
| password | Teks | Ya | Password |
| role | Pilihan | Ya | ${roles.map((r: any) => r.roleName).join(", ")} |
| nama_lengkap | Teks | Ya | Nama lengkap |

${dbSection}

## 5. Menu & Features per Role
${roleMenuSection}

## 6. Frontend Requirements
- Sidebar navigasi berbasis role
- Warna tema: ${design.themeColor || "#0d6efd"}
- Font: ${design.fontFamily || "Plus Jakarta Sans & Outfit"}
- Gaya: ${design.uiStyle || "Modern Premium"}
- Mode: ${design.mode || "light"}

## 7. Backend Requirements
- doGet() entry point
- Fungsi CRUD per entitas
- Fungsi autentikasi
- UUID generator & timestamp utility

## 8. Application Flow Chart

\`\`\`mermaid
flowchart TD
${mermaidNodes}
\`\`\`

## 9. Spesifikasi Desain Visual
- Warna utama: ${design.themeColor || "#0d6efd"}
- Font heading: Outfit
- Font body: Plus Jakarta Sans
- Border radius: 12px
- Shadow: 0 10px 30px -10px rgba(0,0,0,0.1)

## 10. Deployment Guide
1. Buka Google Apps Script (script.google.com)
2. Buat project baru
3. Paste code.gs ke file Code.gs
4. Buat file index.html, paste kode HTML
5. Deploy as Web App (Execute as: Me, Who has access: Anyone)
`;
}
