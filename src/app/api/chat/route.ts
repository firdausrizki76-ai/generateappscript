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

    // 6. Process the request (either real OpenRouter or Demo Mock)
    const body = await req.json();
    const { codeGs, codeHtml, messages, appName, appDescription } = body;
    const apiKey = process.env.OPENROUTER_API_KEY;

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
        explanation = `[MODE DEMO - API KEY KOSONG]\n\nKode awal untuk **${appName || "Aplikasi Anda"}** berhasil dibuat!\n\nSaya telah menyusun backend Google Apps Script (\`code.gs\`) dengan fungsi CRUD terhubung ke Google Sheets, serta file frontend (\`index.html\`) menggunakan UI Bootstrap 5 yang modern dan responsif.\n\nUntuk menghubungkan ke AI asli (OpenRouter API), silakan buat file \`.env.local\` di direktori \`app/\` dan tambahkan:\n\`OPENROUTER_API_KEY=key_anda_di_sini\``;
      } else {
        // Subsequent updates - prepend comments to show simulator activity
        finalCodeGs = `// [Update Demo: ${displayUserMsg.replace(/\n/g, " ")}]\n` + (codeGs || "");
        finalCodeHtml = `<!-- [Update Demo: ${displayUserMsg.replace(/\n/g, " ")}] -->\n` + (codeHtml || "");
        explanation = `[MODE DEMO - API KEY KOSONG]\n\nSaya menerima instruksi Anda: "${displayUserMsg}".\n\nSimulasi: Memperbarui kode di editor dengan menambahkan komentar instruksi di bagian atas file.\n\nSilakan isi \`OPENROUTER_API_KEY\` di \`.env.local\` untuk pemrosesan AI secara penuh!`;
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
      // Call real OpenRouter API
      const lastUserMsg = messages[messages.length - 1]?.content || "";
      const isGreeting = isCasualGreeting(lastUserMsg);

      let systemPrompt = "";

      if (isGreeting) {
        systemPrompt = `Anda adalah asisten pengembang ahli Google Apps Script.
Sapa pengguna dengan ramah dalam bahasa Indonesia dan tanyakan bantuan apa yang mereka butuhkan terkait Google Apps Script atau pembuatan HTML/CSS.
JANGAN membuat atau mengubah kode apa pun. Anda harus mengembalikan respons berformat JSON yang valid dengan skema berikut:
{
  "explanation": "Balasan sapaan ramah Anda kepada pengguna",
  "codeGs": "",
  "codeHtml": ""
}`;
      } else {
        systemPrompt = `Anda adalah asisten pengembang ahli Google Apps Script. 
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
3. Selalu pertahankan kode asli yang sudah ada yang tidak berhubungan dengan perubahan. Jangan memotong atau menyisakan placeholder seperti "// kode lainnya...". Kembalikan KODE UTUH yang bisa langsung digunakan dengan menyertakan karakter baris baru (newline "\n") dan indentasi yang rapi (JANGAN menggabungkan kode menjadi satu baris tunggal atau format minified).
4. Anda harus mengembalikan respons berformat JSON yang valid dengan skema berikut:
{
  "explanation": "Penjelasan detail mengenai perubahan apa saja yang telah dilakukan dalam bahasa Indonesia",
  "codeGs": "Isi lengkap file code.gs terbaru (kode utuh)",
  "codeHtml": "Isi lengkap file index.html terbaru (kode utuh)"
}
5. PENTING UNTUK EFISIENSI & KECEPATAN: Jika permintaan pengguna hanyalah pertanyaan umum, penjelasan kode, obrolan santai, atau tidak memerlukan perubahan kode sama sekali, Anda HARUS mengembalikan string kosong ("") pada kolom "codeGs" dan/atau "codeHtml". Hanya isi kode lengkap jika ada perubahan/modifikasi nyata pada file tersebut. Jika salah satu file tidak berubah, isi file yang tidak berubah tersebut dengan string kosong ("").
6. KEPATUHAN FORMAT: Semua respons Anda HARUS berupa objek JSON dengan format di atas, tanpa teks pengantar atau penutup di luar objek JSON tersebut. Jika pengguna hanya menyapa atau mengobrol biasa, isi field "explanation" dengan balasan Anda dan isi "codeGs" serta "codeHtml" dengan string kosong (""). JANGAN mengembalikan teks biasa tanpa format JSON.`;
      }

      const formattedMessages = [
        { role: "system", content: systemPrompt },
        ...messages
          .filter((m: any) => m.content && !m.content.trim().startsWith("❌"))
          .map((m: any) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
          })),
      ];

      const modelName = process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat";
      const openRouterUrl = "https://openrouter.ai/api/v1/chat/completions";

      const payload = {
        model: modelName,
        messages: formattedMessages,
      };

      const res = await fetchOpenRouterWithRetry(openRouterUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "https://generateappscript.vercel.app/",
          "X-Title": "AppScript Generator",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenRouter API Error (${res.status}): ${errText}`);
      }

      const data = await res.json();
      const rawText = data.choices?.[0]?.message?.content;

      if (!rawText) {
        throw new Error("Respon AI kosong dari OpenRouter API.");
      }

      // Clean up markdown block wrapping if present (e.g. ```json ... ```)
      let cleanText = rawText.trim();
      
      // A function to try parsing JSON or extracting it via regex
      let parsedResponse: { explanation: string; codeGs: string; codeHtml: string } | null = null;
      
      try {
        // Try direct parse first
        parsedResponse = JSON.parse(cleanText);
      } catch (e) {
        // Try cleaning standard markdown code blocks first
        if (cleanText.includes("```")) {
          // Attempt to strip out the code block and parse what's inside
          const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
          const match = cleanText.match(codeBlockRegex);
          if (match && match[1]) {
            try {
              parsedResponse = JSON.parse(match[1].trim());
            } catch (innerError) {
              console.warn("Failed to parse JSON inside markdown block:", innerError);
            }
          }
        }
        
        // If still failed, search for the first '{' and last '}' to extract raw JSON structure
        if (!parsedResponse) {
          const firstBrace = cleanText.indexOf("{");
          const lastBrace = cleanText.lastIndexOf("}");
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            const potentialJson = cleanText.substring(firstBrace, lastBrace + 1);
            try {
              parsedResponse = JSON.parse(potentialJson.trim());
            } catch (braceError) {
              console.warn("Failed to parse JSON extracted from braces:", braceError);
            }
          }
        }
      }

      if (!parsedResponse) {
        console.warn("Failed all JSON parsing strategies for AI response, using fallback.");
        parsedResponse = {
          explanation: rawText,
          codeGs: "",
          codeHtml: "",
        };
      }

      responseData = {
        success: true,
        explanation: parsedResponse.explanation || rawText || "",
        codeGs: parsedResponse.codeGs || codeGs || "",
        codeHtml: parsedResponse.codeHtml || codeHtml || "",
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

// Helper function to fetch OpenRouter API with exponential backoff retry for transient errors (503, 429, etc.)
async function fetchOpenRouterWithRetry(
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
        console.warn(`OpenRouter API returned status ${res.status}. Attempt ${attempt}/${maxRetries}. Retrying in ${currentDelay}ms...`);
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, currentDelay));
          currentDelay *= 2; // exponential backoff
          continue;
        }
      }

      return res; // Return other errors immediately (e.g., 400 Bad Request, 401/403)
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

  throw lastError || new Error("Failed to connect to OpenRouter API after multiple retries");
}

function isCasualGreeting(text: string): boolean {
  const clean = text.trim().toLowerCase().replace(/[^a-z\s]/g, "");
  const greetings = [
    "hi", "hello", "halo", "hei", "hey", "p", "test", "tes", "ping", "pinging",
    "pagi", "siang", "sore", "malam", "assalamualaikum", "selamat pagi", 
    "selamat siang", "selamat sore", "selamat malam", "apa kabar", "apakabar", 
    "oi", "bro", "sis", "halo asisten", "halo ai", "hello ai", "hello assistant",
    "hey ai", "hey assistant"
  ];
  return greetings.includes(clean) || clean.length <= 2;
}
