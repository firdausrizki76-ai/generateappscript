import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getInitialGsCode, getInitialHtmlCode } from "@/lib/templates";
import { getUserQuotaCycle } from "@/lib/quota";

const PLAN_LIMITS: Record<string, number> = { free: 1, pro: 10, business: 30 };
const CHAT_LIMITS: Record<string, number> = { free: 0, pro: 50, business: 150 };

export async function POST(req: Request) {
  try {
    // 1. Get token from Authorization header
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Autentikasi diperlukan. Silakan login kembali." },
        { status: 401 }
      );
    }

    // 2. Initialize request-scoped Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabaseServer = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // 3. Get user profile
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Sesi tidak valid atau telah berakhir." },
        { status: 401 }
      );
    }

    const { cycleId, limit: quotaLimit, chatLimit: chatQuotaLimit } = await getUserQuotaCycle(supabaseServer, user.id);

    // 4. Fetch or create quota row
    let { data: quota, error: quotaError } = await supabaseServer
      .from("quota_usage")
      .select("*")
      .eq("month", cycleId)
      .single();

    if (quotaError || !quota) {
      const { data: newQuota, error: createQuotaError } = await supabaseServer
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

      if (createQuotaError || !newQuota) {
        console.error("Failed to create quota row:", createQuotaError);
        return NextResponse.json(
          { success: false, error: "Gagal memproses kuota pengguna." },
          { status: 500 }
        );
      }
      quota = newQuota;
    }

    // 5. Enforce Chat Quota Limits
    if (quota.chat_used >= quota.chat_limit) {
      return NextResponse.json(
        {
          success: false,
          error: `Batas kuota chat bulanan Anda telah habis (${quota.chat_used}/${quota.chat_limit}).`,
        },
        { status: 403 }
      );
    }

    // 6. Process the request (either real Gemini or Demo Mock)
    const body = await req.json();
    const { codeGs, codeHtml, messages, appName, appDescription } = body;
    const apiKey = process.env.GEMINI_API_KEY;

    let responseData: {
      success: boolean;
      explanation: string;
      codeGs: string;
      codeHtml: string;
    };

    if (!apiKey) {
      // Mock Response for Local Testing (Anti-Crash Fallback)
      const lastUserMessage = messages[messages.length - 1]?.content || "";
      const displayUserMsg = lastUserMessage.length > 100 
        ? lastUserMessage.substring(0, 100) + "..." 
        : lastUserMessage;

      let finalCodeGs = codeGs;
      let finalCodeHtml = codeHtml;
      let explanation = "";

      if (!codeGs && !codeHtml) {
        // First time generation - return templates
        finalCodeGs = getInitialGsCode(appName, appDescription);
        finalCodeHtml = getInitialHtmlCode(appName, appDescription);
        explanation = `[MODE DEMO - API KEY KOSONG]\n\nKode awal untuk **${appName || "Aplikasi Anda"}** berhasil dibuat!\n\nSaya telah menyusun backend Google Apps Script (\`code.gs\`) dengan fungsi CRUD terhubung ke Google Sheets, serta file frontend (\`index.html\`) menggunakan UI Bootstrap 5 yang modern dan responsif.\n\nUntuk menghubungkan ke AI asli (Gemini API), silakan buat file \`.env.local\` di direktori \`app/\` dan tambahkan:\n\`GEMINI_API_KEY=key_anda_di_sini\``;
      } else {
        // Subsequent updates - prepend comments to show simulator activity
        finalCodeGs = `// [Update Demo: ${displayUserMsg.replace(/\n/g, " ")}]\n` + (codeGs || "");
        finalCodeHtml = `<!-- [Update Demo: ${displayUserMsg.replace(/\n/g, " ")}] -->\n` + (codeHtml || "");
        explanation = `[MODE DEMO - API KEY KOSONG]\n\nSaya menerima instruksi Anda: "${displayUserMsg}".\n\nSimulasi: Memperbarui kode di editor dengan menambahkan komentar instruksi di bagian atas file.\n\nSilakan isi \`GEMINI_API_KEY\` di \`.env.local\` untuk pemrosesan AI secara penuh!`;
      }

      // Artificial Delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      responseData = {
        success: true,
        explanation,
        codeGs: finalCodeGs,
        codeHtml: finalCodeHtml,
      };
    } else {
      // Call real Gemini API
      const systemPrompt = `Anda adalah asisten pengembang ahli Google Apps Script. 
Tugas Anda adalah memperbarui atau memodifikasi file backend (code.gs) dan frontend (index.html) aplikasi Google Apps Script berdasarkan permintaan pengguna.
Aplikasi saat ini: "${appName}" - Deskripsi: "${appDescription}"

Berikut adalah isi file saat ini:
=== FILE: code.gs ===
${codeGs}

=== FILE: index.html ===
${codeHtml}

Tugas Anda:
1. Analisis permintaan perubahan dari pengguna di riwayat obrolan (messages).
2. Perbarui file code.gs dan index.html agar memuat fitur yang diminta.
3. Selalu pertahankan kode asli yang sudah ada yang tidak berhubungan dengan perubahan. Jangan memotong atau menyisakan placeholder seperti "// kode lainnya...". Kembalikan KODE UTUH yang bisa langsung digunakan.
4. Anda harus mengembalikan respons berformat JSON yang valid dengan skema berikut:
{
  "explanation": "Penjelasan detail mengenai perubahan apa saja yang telah dilakukan dalam bahasa Indonesia",
  "codeGs": "Isi lengkap file code.gs terbaru (kode utuh)",
  "codeHtml": "Isi lengkap file index.html terbaru (kode utuh)"
}`;

      const contents = messages.map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      const payload = {
        contents,
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              explanation: { type: "STRING" },
              codeGs: { type: "STRING" },
              codeHtml: { type: "STRING" },
            },
            required: ["explanation", "codeGs", "codeHtml"],
          },
        },
      };

      const res = await fetchGeminiWithRetry(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini API Error (${res.status}): ${errText}`);
      }

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error("Respon AI kosong dari Gemini API.");
      }

      const parsedResponse = JSON.parse(rawText);

      responseData = {
        success: true,
        explanation: parsedResponse.explanation,
        codeGs: parsedResponse.codeGs,
        codeHtml: parsedResponse.codeHtml,
      };
    }

    // 7. Increment chat quota in database (using security definer function RPC)
    const { error: rpcError } = await supabaseServer.rpc("increment_chat_quota", {
      user_id_val: user.id,
      month_val: cycleId,
    });

    if (rpcError) {
      console.error("Failed to increment chat quota:", rpcError);
    }

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error("API Chat Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Terjadi kesalahan internal pada server API.",
      },
      { status: 500 }
    );
  }
}

// Helper function to fetch Gemini API with exponential backoff retry for transient errors (503, 429, etc.)
async function fetchGeminiWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  delayMs = 1500
): Promise<Response> {
  let lastError: Error | null = null;
  let currentDelay = delayMs;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);

      if (res.ok) {
        return res;
      }

      // Retry on rate limit (429) or temporary server issues (502, 503, 504)
      if ([429, 502, 503, 504].includes(res.status)) {
        console.warn(`Gemini API returned status ${res.status}. Attempt ${attempt}/${maxRetries}. Retrying in ${currentDelay}ms...`);
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, currentDelay));
          currentDelay *= 2; // exponential backoff
          continue;
        }
      }

      return res; // Return other errors immediately (e.g., 400 Bad Request, 401 Unauthorized)
    } catch (err: any) {
      lastError = err;
      console.error(`Fetch attempt ${attempt} failed with error:`, err);
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, currentDelay));
        currentDelay *= 2;
        continue;
      }
    }
  }

  throw lastError || new Error("Failed to connect to Gemini API after multiple retries");
}
