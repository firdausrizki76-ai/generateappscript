"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Copy,
  Download,
  Sparkles,
  Check,
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Search,
  MessageSquare,
  Send,
  Terminal,
  FileCode,
  Lock,
  Unlock,
  Save,
  FileText,
  AlertTriangle,
} from "lucide-react";
import {
  getPromptById,
  getProfile,
  saveProfile,
  isLoggedIn,
  updatePromptCodeAndChat,
  type PromptHistory,
  type UserProfile,
} from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { compileFullHTMLStructure } from "@/lib/prompt-builder";

// Helper to extract content inside [TAG]...[/TAG] or to the end of string if not closed yet
const parseTaggedContent = (text: string) => {
  const extractTag = (startTag: string, endTag: string) => {
    const startIdx = text.indexOf(startTag);
    if (startIdx === -1) return "";
    const contentStartIdx = startIdx + startTag.length;
    const endIdx = text.indexOf(endTag, contentStartIdx);
    return endIdx === -1 ? text.substring(contentStartIdx) : text.substring(contentStartIdx, endIdx);
  };

  const hasExplanation = text.includes("[EXPLANATION]");
  const hasGs = text.includes("[CODE_GS]");
  const hasHtml = text.includes("[CODE_HTML]");

  let explanation = "";
  let codeGs = "";
  let codeHtml = "";

  const cleanLeading = (str: string) => str.replace(/^\s+/, "");
  
  const cleanCodeFences = (str: string) => {
    let cleaned = str.trim();
    // Remove leading ```javascript or ```html or ``` (case-insensitive)
    cleaned = cleaned.replace(/^`{3,4}(?:javascript|html|gs|js)?\s*\n?/i, "");
    // Remove trailing ```
    cleaned = cleaned.replace(/\n?`{3,4}\s*$/, "");
    return cleaned.trim();
  };

  if (hasExplanation) {
    explanation = cleanLeading(extractTag("[EXPLANATION]", "[/EXPLANATION]"));
  } else {
    // If we don't have the [EXPLANATION] tag yet:
    // Check if the current text is just a prefix of "[EXPLANATION]"
    const prefixOfTag = "[EXPLANATION]".startsWith(text);
    if (!prefixOfTag && !hasGs && !hasHtml) {
      const codeStartIdx = text.indexOf("```");
      if (codeStartIdx !== -1) {
        explanation = cleanLeading(text.substring(0, codeStartIdx));
      } else {
        explanation = cleanLeading(text);
      }
    }
  }

  if (hasGs) {
    codeGs = cleanCodeFences(cleanLeading(extractTag("[CODE_GS]", "[/CODE_GS]")));
  }
  if (hasHtml) {
    codeHtml = cleanCodeFences(cleanLeading(extractTag("[CODE_HTML]", "[/CODE_HTML]")));
  }

  // Fallback: If no tags were generated but there is a markdown code block, extract it
  if (!hasGs && !hasHtml) {
    const codeStartIdx = text.indexOf("```");
    if (codeStartIdx !== -1) {
      const codePart = text.substring(codeStartIdx);
      codeGs = cleanCodeFences(codePart);
      codeHtml = cleanCodeFences(codePart);
    }
  }

  return { explanation, codeGs, codeHtml };
};

// Helper to filter out tag prefix/tag from raw explanation stream safely
const getBubbleContent = (text: string, parsedContent: ReturnType<typeof parseTaggedContent>) => {
  if (text.includes("[EXPLANATION]")) {
    return parsedContent.explanation;
  }
  if ("[EXPLANATION]".startsWith(text)) {
    return "";
  }
  if (text.includes("```") && !text.includes("[CODE_GS]") && !text.includes("[CODE_HTML]")) {
    return parsedContent.explanation;
  }
  return text;
};

function ResultPageContent() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [prompt, setPrompt] = useState<PromptHistory | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  // UI States
  const [activeTab, setActiveTab] = useState<"plan" | "gs" | "html">("plan");
  const [copied, setCopied] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  // Editor states (local copies)
  const [editedGs, setEditedGs] = useState("");
  const [editedHtml, setEditedHtml] = useState("");
  const [isSaved, setIsSaved] = useState(true);

  // Chat states
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string; reasoning?: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [firstGenLoading, setFirstGenLoading] = useState(false);
  const [firstGenStatus, setFirstGenStatus] = useState("");

  // Quota modal warning
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [showTruncationModal, setShowTruncationModal] = useState(false);
  const [truncatedType, setTruncatedType] = useState<"gs" | "html" | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat container internally (without locking main page scroll)
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, chatLoading]);

  const searchParams = useSearchParams();
  const isLiveParam = searchParams?.get("live") === "true";
  const [isPrdStreaming, setIsPrdStreaming] = useState(false);
  const [livePrdMd, setLivePrdMd] = useState("");

  const streamPrdGeneration = async (foundPrompt: PromptHistory) => {
    if (!foundPrompt.interviewData) return;
    setIsPrdStreaming(true);
    setLivePrdMd("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Autentikasi diperlukan. Silakan login kembali.");

      const res = await fetch("/api/generate-prd", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ interviewData: foundPrompt.interviewData }),
      });

      if (!res.ok) {
        const errText = await res.text();
        let errMsg = errText;
        try {
          const parsed = JSON.parse(errText);
          if (parsed.error) errMsg = parsed.error;
        } catch (e) {}
        throw new Error(errMsg || "Gagal memproses streaming PRD.");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Response stream is not available.");

      const decoder = new TextDecoder();
      let done = false;
      let buffer = "";
      let accumulated = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === "data: [DONE]") continue;
            if (trimmed.startsWith("data: ")) {
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                const delta = parsed.choices?.[0]?.delta?.content || "";
                accumulated += delta;
                setLivePrdMd(accumulated);
              } catch (e) {}
            }
          }
        }
      }

      let cleanPrd = accumulated.trim();
      if (cleanPrd.startsWith("```markdown")) {
        cleanPrd = cleanPrd.replace(/^```markdown\s*\n?/, "").replace(/\n?```\s*$/, "");
      } else if (cleanPrd.startsWith("```md")) {
        cleanPrd = cleanPrd.replace(/^```md\s*\n?/, "").replace(/\n?```\s*$/, "");
      } else if (cleanPrd.startsWith("```") && !cleanPrd.startsWith("```mermaid")) {
        cleanPrd = cleanPrd.replace(/^```\s*\n?/, "").replace(/\n?```\s*$/, "");
      }

      const finalMarkdown = cleanPrd || accumulated;
      setPrompt((prev) => (prev ? { ...prev, outputMd: finalMarkdown } : null));

      // Save output_md to Supabase DB
      await supabase.from("prompts").update({ output_md: finalMarkdown }).eq("id", foundPrompt.id);

      // Refresh profile quota
      const updatedProf = await getProfile();
      setProfile(updatedProf);
    } catch (err: any) {
      console.error("Error streaming PRD:", err);
      alert(`Gagal meracik PRD: ${err.message || "Terjadi kesalahan koneksi."}`);
    } finally {
      setIsPrdStreaming(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    const loadData = async () => {
      try {
        const found = await getPromptById(id);
        if (found) {
          setPrompt(found);
          setEditedGs(found.codeGs || "");
          setEditedHtml(found.codeHtml || "");
          setChatMessages(found.chatHistory || []);
          if (found.codeGs) {
            setActiveTab("gs");
          }

          // Trigger live stream if redirected from generate page or outputMd is empty
          if (isLiveParam || (found.isAiGeneratedPrd && !found.outputMd && found.interviewData)) {
            streamPrdGeneration(found);
          }
        }
        const prof = await getProfile();
        setProfile(prof);
      } catch (err) {
        console.error("Failed to load prompt workspace:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, router]);

  // Save history changes back to database
  const saveWorkspaceToHistory = async (newGs: string, newHtml: string, newChat: typeof chatMessages) => {
    if (!id) return;
    try {
      await updatePromptCodeAndChat(id, newGs, newHtml, newChat);
    } catch (err) {
      console.error("Failed to save workspace to database:", err);
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Generate code.gs (Backend)
  const handleGenerateGs = async () => {
    if (!prompt || !profile) return;

    if (profile.chatQuotaUsed >= profile.chatQuotaLimit) {
      setShowQuotaModal(true);
      return;
    }

    setFirstGenLoading(true);
    setFirstGenStatus("Menghasilkan kode backend (code.gs)...");
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");
      }

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Konfigurasi Supabase tidak lengkap di environment.");
      }

      const initialMessagesGs = [
        {
          role: "user" as const,
          content: `Buatkan kode backend (code.gs) saja berdasarkan plan berikut:\n\n${prompt.outputMd}\n\nPENTING: Anda WAJIB mengembalikan respons dengan format tag berikut:\n[EXPLANATION]Penjelasan singkat[/EXPLANATION]\n[CODE_GS]Isi kode backend[/CODE_GS]`,
        },
      ];

      const userMsg = { role: "user" as const, content: "✨ Generate kode backend" };
      const assistantTempMsg = { role: "assistant" as const, content: "" };
      const updatedChat = [...chatMessages, userMsg, assistantTempMsg];
      setChatMessages(updatedChat);

      const response = await fetch(`${supabaseUrl}/functions/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "apikey": supabaseAnonKey,
        },
        body: JSON.stringify({
          appName: prompt.appName,
          appDescription: prompt.description,
          codeGs: "",
          codeHtml: "",
          generateType: "gs",
          messages: initialMessagesGs,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        let errMsg = errText;
        try { 
          const errObj = JSON.parse(errText); 
          if (errObj.error) errMsg = errObj.error; 
        } catch(e) {}
        if (errMsg.includes("429") || errMsg.includes("rate limited") || errMsg.includes("busy")) {
          errMsg = "Model AI (DeepSeek) saat ini sedang sangat sibuk atau server sedang penuh. Silakan tunggu beberapa saat lalu coba lagi.";
        }
        throw new Error(errMsg || "Gagal memproses streaming backend.");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Response stream is not available.");
      }

      const decoder = new TextDecoder();
      let done = false;
      let buffer = "";
      let accumulatedText = "";
      let accumulatedReasoning = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === "data: [DONE]") continue;
            if (trimmed.startsWith("data: ")) {
              let parsed;
              try {
                parsed = JSON.parse(trimmed.slice(6));
              } catch (e) {
                continue;
              }

              if (parsed.error) {
                const errMsg = parsed.error.message || JSON.stringify(parsed.error);
                throw new Error(errMsg);
              }

              const content = parsed.choices?.[0]?.delta?.content || "";
              const reasoning = parsed.choices?.[0]?.delta?.reasoning || parsed.choices?.[0]?.delta?.reasoning_content || "";
              accumulatedText += content;
              accumulatedReasoning += reasoning;

              const parsedContent = parseTaggedContent(accumulatedText);

              if (parsedContent.codeGs) {
                setEditedGs(parsedContent.codeGs);
              }

              const bubbleContent = getBubbleContent(accumulatedText, parsedContent);
              setChatMessages((prev) => {
                const next = [...prev];
                if (next.length > 0) {
                  next[next.length - 1] = {
                    role: "assistant",
                    content: bubbleContent || (accumulatedReasoning ? "" : "Membuat backend..."),
                    reasoning: accumulatedReasoning || undefined,
                  };
                }
                return next;
              });
            }
          }
        }
      }

      const finalParsed = parseTaggedContent(accumulatedText);
      const generatedGs = finalParsed.codeGs;
      if (!generatedGs) {
        // Remove think block for preview
        const withoutThink = accumulatedText.replace(/<think>[\s\S]*?<\/think>/, '').trim();
        const preview = withoutThink.substring(0, 150) + (withoutThink.length > 150 ? "..." : "");
        console.error("RAW AI OUTPUT:", accumulatedText);
        throw new Error("Model AI tidak mengembalikan blok kode backend ([CODE_GS]) yang valid. Silakan coba generate ulang.\n\nOutput AI: " + preview);
      }
      setEditedGs(generatedGs);

      const gsAssistantMessage = {
        role: "assistant" as const,
        content: (finalParsed.explanation || "") + "\n\n✓ Kode backend (code.gs) berhasil dibuat. Silakan periksa tab editor di sebelah kiri.",
        reasoning: accumulatedReasoning || undefined,
      };

      const finalChat = [
        ...chatMessages,
        userMsg,
        gsAssistantMessage,
      ];
      setChatMessages(finalChat);

      // Refresh profile quota from DB
      const updatedProf = await getProfile();
      setProfile(updatedProf);

      // Simpan ke database
      await saveWorkspaceToHistory(generatedGs, editedHtml, finalChat);

      // Check truncation
      const isTruncated = accumulatedText.includes("[CODE_GS]") && !accumulatedText.includes("[/CODE_GS]");
      if (isTruncated) {
        setTruncatedType("gs");
        setShowTruncationModal(true);
      } else {
        setTruncatedType(null);
      }
    } catch (err: any) {
      alert(`Error: ${err.message || "Gagal menghubungkan ke server."}`);
      setChatMessages((prev) => {
        const next = [...prev];
        if (next.length > 0 && next[next.length - 1].role === "assistant" && !next[next.length - 1].content) {
          next.pop();
        }
        return next;
      });
    } finally {
      setFirstGenLoading(false);
      setFirstGenStatus("");
    }
  };

  // Generate index.html (Frontend)
  const handleGenerateHtml = async () => {
    if (!prompt || !profile || !editedGs) return;

    setFirstGenLoading(true);
    setFirstGenStatus("Menghasilkan kode frontend (index.html)...");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");
      }

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Konfigurasi Supabase tidak lengkap di environment.");
      }

      const compiledHtmlLayout = compileFullHTMLStructure(prompt.inputData);

      const initialMessagesHtml = [
        {
          role: "user" as const,
          content: `Berikut adalah template frontend (index.html) lengkap yang telah di-generate secara visual oleh user:\n\n\`\`\`html\n${compiledHtmlLayout}\n\`\`\`\n\nDan berikut adalah kode backend (code.gs) yang SUDAH FINAL dan TIDAK BOLEH DIUBAH:\n\n\`\`\`javascript\n${editedGs}\n\`\`\`\n\nINSTRUKSI KRITIS:\n1. AI WAJIB membaca code.gs di atas secara seksama dan mengidentifikasi SEMUA nama fungsi yang ada (misalnya: getData_Sheet_Daftar_Siswa, createData_Sheet_Daftar_Siswa, dll).\n2. Di dalam tag <script> pada index.html, SEMUA panggilan google.script.run WAJIB menggunakan nama fungsi yang PERSIS SAMA dengan yang tertulis di code.gs. DILARANG KERAS membuat nama fungsi baru seperti getStudents(), saveStudent(), loadData() yang TIDAK ADA di code.gs.\n3. Properti objek payload yang dikirim ke backend DAN properti objek yang diterima dari backend HARUS menggunakan key yang SAMA PERSIS dengan yang ada di code.gs (contoh: jika code.gs pakai nama_siswa, maka frontend juga harus pakai nama_siswa, BUKAN name atau studentName).\n4. AI WAJIB melengkapi template index.html di atas dengan menyisipkan seluruh logika interaksi client-side di dalam tag <script> yang tepat.\n5. Hindari mengubah struktur HTML atau kelas CSS dari template, cukup tambahkan kode JavaScript interaksinya saja.\n\nKembalikan seluruh berkas index.html lengkap yang sudah terintegrasi dengan kode JavaScript di dalam tag [CODE_HTML] ... [/CODE_HTML].`,
        },
      ];

      const userHtmlMsg = { role: "user" as const, content: "✨ Generate kode frontend" };
      const assistantHtmlTempMsg = { role: "assistant" as const, content: "" };
      const updatedChat = [...chatMessages, userHtmlMsg, assistantHtmlTempMsg];
      setChatMessages(updatedChat);

      const responseHtml = await fetch(`${supabaseUrl}/functions/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "apikey": supabaseAnonKey,
        },
        body: JSON.stringify({
          appName: prompt.appName,
          appDescription: prompt.description,
          codeGs: editedGs,
          codeHtml: "",
          generateType: "html",
          skipQuotaIncrement: true,
          messages: initialMessagesHtml,
        }),
      });

      if (!responseHtml.ok) {
        const errText = await responseHtml.text();
        let errMsg = errText;
        try { 
          const errObj = JSON.parse(errText); 
          if (errObj.error) errMsg = errObj.error; 
        } catch(e) {}
        if (errMsg.includes("429") || errMsg.includes("rate limited") || errMsg.includes("busy")) {
          errMsg = "Model AI (DeepSeek) saat ini sedang sangat sibuk atau server sedang penuh. Silakan tunggu beberapa saat lalu coba lagi.";
        }
        throw new Error(errMsg || "Gagal memproses streaming frontend.");
      }

      const readerHtml = responseHtml.body?.getReader();
      if (!readerHtml) {
        throw new Error("Response stream is not available.");
      }

      const decoder = new TextDecoder();
      let doneHtml = false;
      let bufferHtml = "";
      let accumulatedTextHtml = "";
      let accumulatedReasoningHtml = "";

      while (!doneHtml) {
        const { value, done: doneReading } = await readerHtml.read();
        doneHtml = doneReading;
        if (value) {
          bufferHtml += decoder.decode(value, { stream: !doneHtml });
          const lines = bufferHtml.split("\n");
          bufferHtml = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === "data: [DONE]") continue;
            if (trimmed.startsWith("data: ")) {
              let parsed;
              try {
                parsed = JSON.parse(trimmed.slice(6));
              } catch (e) {
                continue;
              }

              if (parsed.error) {
                const errMsg = parsed.error.message || JSON.stringify(parsed.error);
                throw new Error(errMsg);
              }

              const content = parsed.choices?.[0]?.delta?.content || "";
              const reasoning = parsed.choices?.[0]?.delta?.reasoning || parsed.choices?.[0]?.delta?.reasoning_content || "";
              accumulatedTextHtml += content;
              accumulatedReasoningHtml += reasoning;

              const parsedContent = parseTaggedContent(accumulatedTextHtml);

              if (parsedContent.codeHtml) {
                setEditedHtml(parsedContent.codeHtml);
              }

              const bubbleContent = getBubbleContent(accumulatedTextHtml, parsedContent);
              setChatMessages((prev) => {
                const next = [...prev];
                if (next.length > 0) {
                  next[next.length - 1] = {
                    role: "assistant",
                    content: bubbleContent || (accumulatedReasoningHtml ? "" : "Membuat frontend..."),
                    reasoning: accumulatedReasoningHtml || undefined,
                  };
                }
                return next;
              });
            }
          }
        }
      }

      const finalParsedHtml = parseTaggedContent(accumulatedTextHtml);
      const generatedHtml = finalParsedHtml.codeHtml;
      if (!generatedHtml) {
        // Remove think block for preview
        const withoutThink = accumulatedTextHtml.replace(/<think>[\s\S]*?<\/think>/, '').trim();
        const preview = withoutThink.substring(0, 150) + (withoutThink.length > 150 ? "..." : "");
        console.error("RAW AI OUTPUT (HTML):", accumulatedTextHtml);
        throw new Error("Model AI tidak mengembalikan blok kode frontend ([CODE_HTML]) yang valid. Silakan coba generate ulang.\n\nOutput AI: " + preview);
      }
      setEditedHtml(generatedHtml);
      setIsSaved(true);

      const htmlAssistantMessage = {
        role: "assistant" as const,
        content: (finalParsedHtml.explanation || "") + "\n\n✓ Kode frontend (index.html) berhasil dibuat! Silakan periksa tab editor di sebelah kiri.",
        reasoning: accumulatedReasoningHtml || undefined,
      };

      const finalChat = [
        ...chatMessages,
        userHtmlMsg,
        htmlAssistantMessage,
      ];
      setChatMessages(finalChat);

      // Simpan ke database
      await saveWorkspaceToHistory(editedGs, generatedHtml, finalChat);

      // Check truncation
      const isTruncated = accumulatedTextHtml.includes("[CODE_HTML]") && !accumulatedTextHtml.includes("[/CODE_HTML]");
      if (isTruncated) {
        setTruncatedType("html");
        setShowTruncationModal(true);
      } else {
        setTruncatedType(null);
      }
    } catch (err: any) {
      alert(`Error: ${err.message || "Gagal menghubungkan ke server."}`);
      setChatMessages((prev) => {
        const next = [...prev];
        if (next.length > 0 && next[next.length - 1].role === "assistant" && !next[next.length - 1].content) {
          next.pop();
        }
        return next;
      });
    } finally {
      setFirstGenLoading(false);
      setFirstGenStatus("");
    }
  };

  const handleManualSave = () => {
    if (!prompt) return;
    saveWorkspaceToHistory(editedGs, editedHtml, chatMessages);
    setIsSaved(true);
  };

  // Handle Chat message sending
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading || !prompt || !profile) return;

    if (profile.chatQuotaUsed >= profile.chatQuotaLimit) {
      setShowQuotaModal(true);
      return;
    }

    const inputLower = chatInput.trim().toLowerCase();
    const isLanjutkanKeyword = 
      inputLower === "lanjutkan" || 
      inputLower === "lanjut" || 
      inputLower === "continue" || 
      inputLower === "cont" || 
      inputLower.startsWith("lanjutkan ") || 
      inputLower.startsWith("lanjut ");

    if (isLanjutkanKeyword) {
      let targetType: "gs" | "html" = "gs";
      if (inputLower.includes("html") || inputLower.includes("frontend")) {
        targetType = "html";
      } else if (inputLower.includes("gs") || inputLower.includes("backend")) {
        targetType = "gs";
      } else {
        targetType = (activeTab === "gs" || activeTab === "html") 
          ? activeTab 
          : (truncatedType || "gs");
      }
      const userTyped = chatInput.trim();
      setChatInput("");
      await handleContinueGeneration(targetType, userTyped);
      return;
    }

    const userMsg = { role: "user" as const, content: chatInput };
    const nextMessages = [...chatMessages, userMsg];
    setChatMessages(nextMessages);
    setChatInput("");
    setChatLoading(true);

    const assistantTempMsg = { role: "assistant" as const, content: "" };
    setChatMessages([...nextMessages, assistantTempMsg]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Konfigurasi Supabase tidak lengkap.");
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "apikey": supabaseAnonKey,
        },
        body: JSON.stringify({
          appName: prompt.appName,
          appDescription: prompt.description,
          codeGs: editedGs,
          codeHtml: editedHtml,
          messages: nextMessages,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        let errMsg = errText;
        try { 
          const errObj = JSON.parse(errText); 
          if (errObj.error) errMsg = errObj.error; 
        } catch(e) {}
        if (errMsg.includes("429") || errMsg.includes("rate limited") || errMsg.includes("busy")) {
          errMsg = "Model AI (DeepSeek) saat ini sedang sangat sibuk atau server sedang penuh. Silakan tunggu beberapa saat lalu coba lagi.";
        }
        throw new Error(errMsg || "Gagal memproses streaming revisi.");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Response stream is not available.");
      }

      const decoder = new TextDecoder();
      let done = false;
      let buffer = "";
      let accumulatedText = "";
      let accumulatedReasoning = "";
      let autoSwitchedGs = false;
      let autoSwitchedHtml = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === "data: [DONE]") continue;
            if (trimmed.startsWith("data: ")) {
              let parsed;
              try {
                parsed = JSON.parse(trimmed.slice(6));
              } catch (e) {
                continue;
              }

              if (parsed.error) {
                const errMsg = parsed.error.message || JSON.stringify(parsed.error);
                throw new Error(errMsg);
              }

              const content = parsed.choices?.[0]?.delta?.content || "";
              const reasoning = parsed.choices?.[0]?.delta?.reasoning || parsed.choices?.[0]?.delta?.reasoning_content || "";
              accumulatedText += content;
              accumulatedReasoning += reasoning;

              const parsedContent = parseTaggedContent(accumulatedText);

              if (accumulatedText.includes("[CODE_GS]")) {
                setEditedGs(parsedContent.codeGs);
                if (!autoSwitchedGs) {
                  autoSwitchedGs = true;
                  setActiveTab("gs");
                }
              }
              if (accumulatedText.includes("[CODE_HTML]")) {
                setEditedHtml(parsedContent.codeHtml);
                if (!autoSwitchedHtml) {
                  autoSwitchedHtml = true;
                  setActiveTab("html");
                }
              }

              const bubbleContent = getBubbleContent(accumulatedText, parsedContent);
              setChatMessages((prev) => {
                const next = [...prev];
                if (next.length > 0) {
                  next[next.length - 1] = {
                    role: "assistant",
                    content: bubbleContent || (accumulatedReasoning ? "" : "Berpikir..."),
                    reasoning: accumulatedReasoning || undefined,
                  };
                }
                return next;
              });
            }
          }
        }
      }

      const finalParsed = parseTaggedContent(accumulatedText);

      let nextGs = editedGs;
      let nextHtml = editedHtml;

      if (accumulatedText.includes("[CODE_GS]")) {
        nextGs = finalParsed.codeGs;
        setEditedGs(nextGs);
      }
      if (accumulatedText.includes("[CODE_HTML]")) {
        nextHtml = finalParsed.codeHtml;
        setEditedHtml(nextHtml);
      }
      setIsSaved(true);

      const assistantMsg = {
        role: "assistant" as const,
        content: finalParsed.explanation || accumulatedText,
        reasoning: accumulatedReasoning || undefined,
      };

      const finalMessages = [...nextMessages, assistantMsg];
      setChatMessages(finalMessages);

      // Refresh profile quota from DB
      const updatedProf = await getProfile();
      setProfile(updatedProf);

      // Save database record
      await saveWorkspaceToHistory(nextGs, nextHtml, finalMessages);

      // Check truncation
      let isGsTruncated = accumulatedText.includes("[CODE_GS]") && !accumulatedText.includes("[/CODE_GS]");
      let isHtmlTruncated = accumulatedText.includes("[CODE_HTML]") && !accumulatedText.includes("[/CODE_HTML]");
      if (isGsTruncated) {
        setTruncatedType("gs");
        setShowTruncationModal(true);
      } else if (isHtmlTruncated) {
        setTruncatedType("html");
        setShowTruncationModal(true);
      } else {
        setTruncatedType(null);
      }
    } catch (err: any) {
      const errorMsg = {
        role: "assistant" as const,
        content: `❌ Gagal memproses permintaan: ${err.message || "Gangguan koneksi API."}`,
      };
      setChatMessages((prev) => {
        const next = [...prev];
        if (next.length > 0) {
          next[next.length - 1] = errorMsg;
        } else {
          next.push(errorMsg);
        }
        return next;
      });
    } finally {
      setChatLoading(false);
    }
  };

  // Continue truncated code generation and append it correctly
  const handleContinueGeneration = async (overrideType?: "gs" | "html", customUserMsgContent?: string) => {
    const type = overrideType || truncatedType;
    if (!prompt || !profile || !type) return;

    const typeLabel = type === "gs" ? "code.gs" : "index.html";
    const userMsgContent = customUserMsgContent || `✨ Lanjutkan ${typeLabel}`;

    setShowTruncationModal(false);
    setChatLoading(true);
    setFirstGenLoading(true);
    setFirstGenStatus(`Melanjutkan penulisan kode ${type === "gs" ? "backend (code.gs)" : "frontend (index.html)"}...`);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");
      }

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Konfigurasi Supabase tidak lengkap.");
      }

      const currentCode = type === "gs" ? editedGs : editedHtml;
      const baseCode = currentCode; // Keep a backup to append to

      const response = await fetch(`${supabaseUrl}/functions/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "apikey": supabaseAnonKey,
        },
        body: JSON.stringify({
          appName: prompt.appName,
          appDescription: prompt.description,
          codeGs: type === "gs" ? currentCode : "",
          codeHtml: type === "html" ? currentCode : "",
          generateType: type,
          isContinuation: true,
          skipQuotaIncrement: true,
          messages: [
            {
              role: "user" as const,
              content: `Lanjutkan penulisan kode ${type === "gs" ? "backend code.gs" : "frontend index.html"} yang terpotong.`,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        let errMsg = errText;
        try { 
          const errObj = JSON.parse(errText); 
          if (errObj.error) errMsg = errObj.error; 
        } catch(e) {}
        if (errMsg.includes("429") || errMsg.includes("rate limited") || errMsg.includes("busy")) {
          errMsg = "Model AI (DeepSeek) saat ini sedang sangat sibuk atau server sedang penuh. Silakan tunggu beberapa saat lalu coba lagi.";
        }
        throw new Error(errMsg || "Gagal melanjutkan streaming.");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Response stream is not available.");
      }

      const decoder = new TextDecoder();
      let done = false;
      let buffer = "";
      let accumulatedText = "";
      let accumulatedReasoning = "";

      // Add a chat bubble to inform the user
      const userMsg = { role: "user" as const, content: userMsgContent };
      const assistantTempMsg = { role: "assistant" as const, content: "Melanjutkan penulisan..." };
      const updatedChat = [...chatMessages, userMsg, assistantTempMsg];
      setChatMessages(updatedChat);

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === "data: [DONE]") continue;
            if (trimmed.startsWith("data: ")) {
              let parsed;
              try {
                parsed = JSON.parse(trimmed.slice(6));
              } catch (e) {
                continue;
              }

              if (parsed.error) {
                const errMsg = parsed.error.message || JSON.stringify(parsed.error);
                throw new Error(errMsg);
              }

              const content = parsed.choices?.[0]?.delta?.content || "";
              const reasoning = parsed.choices?.[0]?.delta?.reasoning || parsed.choices?.[0]?.delta?.reasoning_content || "";
              accumulatedText += content;
              accumulatedReasoning += reasoning;

              const parsedContent = parseTaggedContent(accumulatedText);

              if (type === "gs" && parsedContent.codeGs) {
                setEditedGs(baseCode + parsedContent.codeGs);
              } else if (type === "html" && parsedContent.codeHtml) {
                setEditedHtml(baseCode + parsedContent.codeHtml);
              }

              const bubbleContent = getBubbleContent(accumulatedText, parsedContent);
              setChatMessages((prev) => {
                const next = [...prev];
                if (next.length > 0) {
                  next[next.length - 1] = {
                    role: "assistant",
                    content: bubbleContent || (accumulatedReasoning ? "" : "Melanjutkan penulisan..."),
                    reasoning: accumulatedReasoning || undefined,
                  };
                }
                return next;
              });
            }
          }
        }
      }

      const finalParsed = parseTaggedContent(accumulatedText);
      const continuedCode = type === "gs" ? finalParsed.codeGs : finalParsed.codeHtml;
      
      const finalCode = baseCode + continuedCode;
      if (type === "gs") {
        setEditedGs(finalCode);
      } else {
        setEditedHtml(finalCode);
      }
      setIsSaved(true);

      const assistantMessage = {
        role: "assistant" as const,
        content: (finalParsed.explanation || "") + `\n\n✓ Kode ${type === "gs" ? "backend (code.gs)" : "frontend (index.html)"} berhasil dilanjutkan dan digabungkan!`,
        reasoning: accumulatedReasoning || undefined,
      };

      const finalChat = [...chatMessages, userMsg, assistantMessage];
      setChatMessages(finalChat);

      // Refresh profile quota from DB
      const updatedProf = await getProfile();
      setProfile(updatedProf);

      // Save to database
      await saveWorkspaceToHistory(
        type === "gs" ? finalCode : editedGs,
        type === "html" ? finalCode : editedHtml,
        finalChat
      );

      // Check if it got truncated again
      const closingTag = type === "gs" ? "[/CODE_GS]" : "[/CODE_HTML]";
      const codeTag = type === "gs" ? "[CODE_GS]" : "[CODE_HTML]";
      const isTruncatedAgain = accumulatedText.includes(codeTag) && !accumulatedText.includes(closingTag);
      if (isTruncatedAgain) {
        setTruncatedType(type);
        setShowTruncationModal(true);
      } else {
        setTruncatedType(null);
      }

    } catch (err: any) {
      alert(`Error: ${err.message || "Gagal melanjutkan penulisan kode."}`);
      setChatMessages((prev) => {
        const next = [...prev];
        if (next.length > 0 && next[next.length - 1].role === "assistant" && !next[next.length - 1].content) {
          next.pop();
        }
        return next;
      });
    } finally {
      setFirstGenLoading(false);
      setFirstGenStatus("");
      setChatLoading(false);
    }
  };

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!prompt) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="flex justify-center mb-4">
          <Search className="h-16 w-16 text-surface-600 animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Prompt Tidak Ditemukan</h2>
        <p className="text-surface-400 mb-6">ID prompt tidak valid atau prompt sudah dihapus.</p>
        <Link href="/dashboard" className="btn-primary">
          Kembali ke Dashboard
        </Link>
      </div>
    );
  }

  const isPro = profile?.plan === "pro" || profile?.plan === "business";

  /* Markdown renderer for plan.md view — with Mermaid diagram support */
  const renderMd = (md: string) => {
    const codeBlocks: string[] = [];
    
    // First, extract and protect all code blocks (mermaid and regular), including unclosed ones during streaming
    let processed = md.replace(/```(\w*)\n([\s\S]*?)(?:```|$)/gm, (match) => {
      const idx = codeBlocks.length;
      codeBlocks.push(match);
      return `%%CODE_BLOCK_${idx}%%`;
    });

    const html = processed
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold text-white mt-4 mb-2">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-brand-300 mt-6 mb-3 border-b border-surface-800 pb-1">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-black text-white mb-4">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="bg-surface-900 text-brand-400 px-1 py-0.5 rounded font-mono text-xs border border-surface-800">$1</code>')
      .replace(/^- \[ \] (.+)$/gm, '<li class="flex items-start gap-2 text-sm text-surface-300 my-1"><input type="checkbox" class="mt-1" disabled /> <span>$1</span></li>')
      .replace(/^- \[x\] (.+)$/gm, '<li class="flex items-start gap-2 text-sm text-surface-300 my-1"><input type="checkbox" class="mt-1" checked disabled /> <span>$1</span></li>')
      .replace(/^- (.+)$/gm, '<li class="list-disc ml-5 text-sm text-surface-300 my-1">$1</li>')
      .replace(/^(\|.+\|)$/gm, (match) => {
        const cells = match.split("|").filter((c) => c.trim() !== "");
        if (cells.every((c) => c.trim().match(/^-+$/))) return "";
        const tag = match.includes("---") ? "th" : "td";
        const tdStyle = tag === "th" ? "bg-surface-900 font-semibold text-brand-300 p-2 text-left border border-surface-800" : "p-2 border border-surface-800 text-surface-300 text-sm";
        return `<tr>${cells.map((c) => `<${tag} class="${tdStyle}">${c.trim()}</${tag}>`).join("")}</tr>`;
      })
      .replace(/tr class="sep"\/tr/g, "")
      .replace(/\n\n/g, '</div><div class="my-2">')
      .replace(/\n/g, "<br />");

    let finalHtml = `<div class="text-surface-300">${html}</div>`;

    // Restore blocks
    codeBlocks.forEach((block, idx) => {
      if (block.startsWith("```mermaid")) {
        const content = block.replace(/```mermaid\n([\s\S]*?)(?:```|$)/, "$1").trim();
        finalHtml = finalHtml.replace(
          `%%CODE_BLOCK_${idx}%%`,
          `<div class="mermaid-chart my-6 p-4 rounded-2xl border border-surface-800 bg-surface-900/50 overflow-x-auto"><pre class="mermaid">${content}</pre></div>`
        );
      } else {
        const match = /```(\w*)\n([\s\S]*?)(?:```|$)/.exec(block);
        const content = match ? match[2] : block;
        finalHtml = finalHtml.replace(
          `%%CODE_BLOCK_${idx}%%`,
          `<div class="bg-surface-950 p-4 rounded-xl border border-surface-800 overflow-x-auto my-3"><pre class="font-mono text-xs text-brand-300">${content}</pre></div>`
        );
      }
    });

    return finalHtml;
  };

  // Initialize Mermaid.js for rendering flowcharts
  useEffect(() => {
    const currentMd = isPrdStreaming ? livePrdMd : prompt?.outputMd;
    if (activeTab !== "plan" || !currentMd) return;
    if (!currentMd.includes("```mermaid")) return;

    const initMermaid = async () => {
      // Dynamically load mermaid if not loaded
      if (!(window as any).mermaid) {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js";
        script.onload = () => {
          (window as any).mermaid.initialize({
            startOnLoad: false,
            theme: "dark",
            themeVariables: {
              primaryColor: "#6366f1",
              primaryBorderColor: "#818cf8",
              primaryTextColor: "#e0e7ff",
              lineColor: "#64748b",
              secondaryColor: "#1e293b",
              tertiaryColor: "#0f172a",
              background: "#020617",
              mainBkg: "#1e293b",
              nodeBorder: "#6366f1",
              clusterBkg: "#0f172a",
              titleColor: "#e0e7ff",
              edgeLabelBackground: "#1e293b",
            },
          });
          (window as any).mermaid.run({ querySelector: ".mermaid" });
        };
        document.head.appendChild(script);
      } else {
        // Re-run mermaid rendering
        setTimeout(() => {
          (window as any).mermaid.run({ querySelector: ".mermaid" });
        }, 200);
      }
    };
    initMermaid();
  }, [activeTab, prompt?.outputMd, livePrdMd, isPrdStreaming]);

  return (
    <div className="relative min-h-[85vh] py-6">
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      <div className="absolute inset-0 bg-radial-top pointer-events-none" />

      <div className="relative mx-auto max-w-[95%] px-2 lg:px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="btn-ghost !py-2 !px-3 shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-white font-display">{prompt.appName}</h1>
                <span className="text-[10px] bg-brand-500/10 border border-brand-500/30 text-brand-300 px-2 py-0.5 rounded-full capitalize">
                  Paket: {profile?.plan || "free"}
                </span>
              </div>
              <p className="text-xs text-surface-500 font-medium">
                Selesai dibuat pada {new Date(prompt.createdAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

        </div>

        {/* ── WORKSPACE CORE LAYOUT ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-stretch">
          
          {/* LEFT PANEL: Code Editor / MD Viewer */}
          <div className="glass rounded-2xl overflow-hidden flex flex-col min-h-[600px] border border-surface-800">
            {/* Tabs Controller */}
            <div className="flex items-center justify-between px-4 bg-surface-900 border-b border-surface-800/80">
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveTab("plan")}
                  className={`px-4 py-3 text-xs font-semibold font-display border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                    activeTab === "plan"
                      ? "border-brand-500 text-brand-400 bg-surface-800/35"
                      : "border-transparent text-surface-400 hover:text-surface-200"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  {prompt.isAiGeneratedPrd ? "📋 PRD (AI Generated)" : "plan.md (Prompt)"}
                </button>

                <button
                  onClick={() => setActiveTab("gs")}
                  className={`px-4 py-3 text-xs font-semibold font-display border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                    activeTab === "gs"
                      ? "border-brand-500 text-brand-400 bg-surface-800/35"
                      : "border-transparent text-surface-400 hover:text-surface-200"
                  }`}
                >
                  <Terminal className="h-3.5 w-3.5" />
                  code.gs
                  {!isSaved && activeTab === "gs" && <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />}
                </button>

                <button
                  onClick={() => setActiveTab("html")}
                  className={`px-4 py-3 text-xs font-semibold font-display border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                    activeTab === "html"
                      ? "border-brand-500 text-brand-400 bg-surface-800/35"
                      : "border-transparent text-surface-400 hover:text-surface-200"
                  }`}
                >
                  <FileCode className="h-3.5 w-3.5" />
                  index.html
                  {!isSaved && activeTab === "html" && <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />}
                </button>
              </div>

              {/* Action utilities */}
              <div className="flex gap-2 py-1.5">
                {activeTab === "plan" ? (
                  <>
                    <button
                      onClick={() => handleCopy(prompt.outputMd)}
                      className="text-[10px] font-semibold text-surface-300 hover:text-white bg-surface-800 border border-surface-700 rounded-md py-1 px-2.5 flex items-center gap-1 cursor-pointer transition"
                    >
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      Salin Prompt
                    </button>
                    <button
                      onClick={() => handleDownloadFile(`${prompt.appName.replace(/\s+/g, "_")}_plan.md`, prompt.outputMd)}
                      className="text-[10px] font-semibold text-surface-300 hover:text-white bg-surface-800 border border-surface-700 rounded-md py-1 px-2.5 flex items-center gap-1 cursor-pointer transition"
                    >
                      <Download className="h-3 w-3" />
                      Download .md
                    </button>
                  </>
                ) : (
                  // Editor controls
                  isPro && (editedGs || editedHtml) && (
                    <div className="flex gap-1.5">
                      {!isSaved && (
                        <button
                          onClick={handleManualSave}
                          className="text-[10px] font-semibold text-white bg-green-600 hover:bg-green-500 rounded-md py-1.5 px-2.5 flex items-center gap-1 cursor-pointer transition shadow"
                        >
                          <Save className="h-3.5 w-3.5" />
                          Simpan Perubahan
                        </button>
                      )}
                      <button
                        onClick={() => handleCopy(activeTab === "gs" ? editedGs : editedHtml)}
                        className="text-[10px] font-semibold text-surface-300 hover:text-white bg-surface-800 border border-surface-700 rounded-md py-1 px-2.5 flex items-center gap-1 cursor-pointer transition"
                      >
                        <Copy className="h-3 w-3" />
                        Salin Kode
                      </button>
                      <button
                        onClick={() =>
                          handleDownloadFile(
                            activeTab === "gs" ? "code.gs" : "index.html",
                            activeTab === "gs" ? editedGs : editedHtml
                          )
                        }
                        className="text-[10px] font-semibold text-surface-300 hover:text-white bg-surface-800 border border-surface-700 rounded-md py-1 px-2.5 flex items-center gap-1 cursor-pointer transition"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Content body */}
            <div className="flex-1 flex flex-col p-4 bg-surface-950/40">
              
              {/* TAB 1: Markdown Prompt Plan */}
              {activeTab === "plan" && (
                <div className="flex-1 overflow-y-auto max-h-[650px] pr-2 space-y-4">
                  {/* Guide Toggle */}
                  <div className="border border-surface-800 rounded-xl overflow-hidden bg-surface-900/30">
                    <button
                      onClick={() => setGuideOpen(!guideOpen)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-brand-400" />
                        <span className="font-semibold text-white text-xs">Cara Menggunakan Prompt Ini</span>
                      </div>
                      {guideOpen ? (
                        <ChevronUp className="h-4 w-4 text-surface-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-surface-400" />
                      )}
                    </button>
                    {guideOpen && (
                      <div className="px-4 pb-4 space-y-3 border-t border-surface-800/60 pt-3 animate-fade-up">
                        {(prompt.isAiGeneratedPrd ? [
                          { step: "1", desc: 'PRD ini dihasilkan oleh AI. Klik "Salin PRD" untuk menyalin seluruh dokumen.' },
                          { step: "2", desc: isPro ? 'Gunakan tombol "Generate Code" di panel chat untuk langsung menghasilkan code.gs & index.html.' : 'Tempelkan PRD ke ChatGPT, Claude, atau Gemini dan minta mereka membuatkan kode berdasarkan PRD ini.' },
                          { step: "3", desc: "Buka Google Sheets, ke Extensions > Apps Script, dan pasang kodenya." },
                          { step: "4", desc: "Deploy sebagai Web App dan gunakan aplikasi Anda!" },
                        ] : [
                          { step: "1", desc: 'Klik tombol "Salin Prompt" di kanan atas.' },
                          { step: "2", desc: "Buka chatbot AI seperti ChatGPT atau Claude." },
                          { step: "3", desc: 'Tempelkan prompt ini ke AI dan minta: "Tuliskan kode lengkap code.gs dan index.html berdasarkan plan ini secara lengkap."' },
                          { step: "4", desc: "Buka Google Sheets, ke Extensions > Apps Script, dan pasang kodenya." },
                        ]).map((s) => (
                          <div key={s.step} className="flex gap-3 text-xs leading-relaxed">
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-brand-600 text-white font-bold text-[10px]">
                              {s.step}
                            </div>
                            <div className="text-surface-400">{s.desc}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Live Streaming Indicator Banner */}
                  {isPrdStreaming && (
                    <div className="p-4 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-between animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-brand-400 animate-ping" />
                        <span className="text-xs font-bold text-brand-300">
                          ✨ AI (DeepSeek v4 Pro) sedang mengetik PRD secara live...
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-surface-400 bg-surface-900/60 px-2.5 py-1 rounded-lg border border-surface-800">
                        {livePrdMd.length} karakter
                      </span>
                    </div>
                  )}

                  {/* Rendered Prompt Output */}
                  <div
                    className="p-4 sm:p-6 md-output select-text selection:bg-brand-500/30"
                    dangerouslySetInnerHTML={{
                      __html: renderMd(isPrdStreaming ? (livePrdMd || "⏳ **Menghubungkan ke AI PRD Engine...**") : prompt.outputMd),
                    }}
                  />
                </div>
              )}

              {/* TAB 2 & 3: Code Editors */}
              {activeTab !== "plan" && (
                <div className="flex-1 flex flex-col h-full">
                  {!isPro ? (
                    // Locked state for Free Tier Users
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-surface-800 rounded-xl bg-surface-900/10">
                      <div className="p-3 bg-brand-500/10 text-brand-400 rounded-2xl mb-3">
                        <Lock className="h-8 w-8" />
                      </div>
                      <h3 className="font-bold text-white text-base font-display">Fitur Khusus Paket Pro</h3>
                      <p className="text-xs text-surface-400 max-w-sm mt-1 mb-4 leading-relaxed">
                        Pengguna Pro/Business dapat men-generate kode, mengedit secara langsung di panel workspace ini, dan menyempurnakannya secara interaktif menggunakan AI Chatbot.
                      </p>
                      <button
                        onClick={() => router.push("/account")}
                        className="btn-primary flex items-center gap-1.5 text-xs !py-2.5 cursor-pointer"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Upgrade ke Pro Sekarang
                      </button>
                    </div>
                  ) : (
                    // Pro editor layout
                    <>
                      {/* Empty state: code not yet generated */}
                      {((activeTab === "gs" && !editedGs) || (activeTab === "html" && !editedHtml)) ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-surface-800 rounded-xl bg-surface-900/10">
                          {firstGenLoading ? (
                            <>
                              <div className="h-10 w-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mb-4" />
                              <p className="font-semibold text-brand-300 text-sm animate-pulse">{firstGenStatus || "Menghubungi AI Model..."}</p>
                            </>
                          ) : activeTab === "gs" ? (
                            <>
                              <div className="p-3 bg-brand-500/15 text-brand-300 rounded-2xl mb-3">
                                <Sparkles className="h-7 w-7" />
                              </div>
                              <h3 className="font-semibold text-white text-sm font-display">Kode Backend Belum Dibuat</h3>
                              <p className="text-xs text-surface-400 max-w-xs mt-1 mb-4 leading-relaxed">
                                Klik tombol di bawah untuk menghasilkan file backend (code.gs) awal berdasarkan prompt plan.md.
                              </p>
                              <button
                                onClick={handleGenerateGs}
                                className="btn-primary flex items-center gap-1.5 text-xs"
                              >
                                <Terminal className="h-4 w-4" />
                                Generate code.gs
                              </button>
                            </>
                          ) : (
                            <>
                              <div className="p-3 bg-brand-500/15 text-brand-300 rounded-2xl mb-3">
                                <Sparkles className="h-7 w-7" />
                              </div>
                              <h3 className="font-semibold text-white text-sm font-display">Kode Frontend Belum Dibuat</h3>
                              {!editedGs ? (
                                <p className="text-xs text-surface-400 max-w-xs mt-1 mb-4 leading-relaxed">
                                  Silakan buat kode backend (code.gs) terlebih dahulu sebelum membuat kode frontend.
                                </p>
                              ) : (
                                <>
                                  <p className="text-xs text-surface-400 max-w-xs mt-1 mb-4 leading-relaxed">
                                    Klik tombol di bawah untuk menghasilkan file frontend (index.html) menyesuaikan kode backend (code.gs) yang sudah ada.
                                  </p>
                                  <button
                                    onClick={handleGenerateHtml}
                                    className="btn-primary flex items-center gap-1.5 text-xs"
                                  >
                                    <FileCode className="h-4 w-4" />
                                    Generate index.html
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      ) : (
                        // Code editor workspace
                        <div className="flex-1 flex flex-col h-full min-h-[500px]">
                          <div className="flex items-center justify-between text-[10px] text-surface-500 mb-1 px-1 font-mono">
                            <span>SUNTING KODE MANUAL (Ketik langsung di sini):</span>
                            <span>{!isSaved ? "⚠️ Perubahan belum disimpan" : "✓ Tersimpan otomatis ke browser"}</span>
                          </div>
                          <textarea
                            value={activeTab === "gs" ? editedGs : editedHtml}
                            onChange={(e) => {
                              if (activeTab === "gs") setEditedGs(e.target.value);
                              else setEditedHtml(e.target.value);
                              setIsSaved(false);
                            }}
                            className="flex-1 w-full bg-surface-950 text-brand-300 p-4 rounded-xl font-mono text-xs border border-surface-800 focus:outline-none focus:ring-1 focus:ring-brand-500/35 overflow-y-auto resize-none min-h-[480px]"
                            placeholder={activeTab === "gs" ? "// Ketik kode Apps Script Anda..." : "<!-- Ketik kode HTML Anda... -->"}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: AI Chatbot */}
          <div className="glass rounded-2xl overflow-hidden flex flex-col h-[600px] border border-surface-800">
            {/* Chat header */}
            <div className="px-4 py-3.5 bg-surface-900 border-b border-surface-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-brand-400" />
                <span className="font-bold text-white text-xs font-display">Asisten AI Chatbot</span>
              </div>
              
              {isPro && profile && (
                <div className="text-[10px] text-surface-500 font-mono">
                  Kuota Chat: <span className="font-semibold text-brand-400">{profile.chatQuotaUsed}</span> / {profile.chatQuotaLimit}
                </div>
              )}
            </div>

            {/* Chat Messages */}
            <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto space-y-4 bg-surface-950/20 flex flex-col">
              {!isPro ? (
                // Locked status for Free users
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                  <Lock className="h-10 w-10 text-surface-600 mb-2" />
                  <h4 className="font-semibold text-white text-xs font-display">Chatbot Terkunci</h4>
                  <p className="text-[10px] text-surface-400 max-w-[220px] mt-0.5 leading-relaxed">
                    Tingkatkan ke paket Pro untuk mengakses asisten bot AI interaktif yang langsung mengubah kode di editor.
                  </p>
                </div>
              ) : chatMessages.length === 0 ? (
                // Welcoming message
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-surface-400">
                  <Sparkles className="h-8 w-8 text-brand-400 mb-2 animate-pulse" />
                  <p className="text-xs font-semibold text-white">Butuh Modifikasi Tambahan?</p>
                  <p className="text-[10px] text-surface-500 max-w-[250px] mt-1 leading-relaxed">
                    Ketik perintah Anda di bawah untuk merevisi fitur, mengganti warna tema, menambah sheet baru, dsb. AI akan otomatis memperbarui kode Anda!
                  </p>
                </div>
              ) : (
                // List of conversation messages
                chatMessages.map((msg, i) => {
                  const isUser = msg.role === "user";
                  const displayContent = isUser && (msg.content.includes("plan berikut:") || msg.content.length > 500)
                    ? "✨ Generate kode awal dari plan.md"
                    : msg.content;
                  return (
                    <div
                      key={i}
                      className={`flex flex-col max-w-[85%] ${isUser ? "self-end items-end" : "self-start items-start"}`}
                    >
                      <span className="text-[9px] text-surface-500 mb-1 px-1 font-mono">
                        {isUser ? "Anda" : "AI Asisten"}
                      </span>
                      <div
                        className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                          isUser
                            ? "bg-gradient-to-br from-brand-600 to-indigo-600 text-white shadow-md rounded-tr-none"
                            : "bg-surface-850 border border-surface-800 text-surface-200 rounded-tl-none select-text"
                        }`}
                      >
                        {!isUser && msg.reasoning && (
                          <details className="mb-3 bg-surface-900/50 border border-surface-800 rounded-xl p-2.5 text-surface-400 text-[11px]" open>
                            <summary className="cursor-pointer font-bold text-brand-400 hover:text-brand-300 select-none flex items-center gap-1.5">
                              <Sparkles className="h-3 w-3 animate-pulse text-brand-400" />
                              <span>Proses Berpikir (Thinking Process)</span>
                            </summary>
                            <div className="mt-2 pl-2 border-l-2 border-surface-700 font-mono text-[10px] text-surface-300 leading-relaxed whitespace-pre-wrap select-text">
                              {msg.reasoning}
                            </div>
                          </details>
                        )}
                        {displayContent}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Chat loading state indicator */}
              {chatLoading && (
                <div className="flex flex-col max-w-[85%] self-start items-start animate-pulse">
                  <span className="text-[9px] text-surface-500 mb-1 px-1 font-mono">AI Asisten</span>
                  <div className="bg-surface-850 border border-surface-800 p-3 rounded-2xl rounded-tl-none text-xs text-brand-400 flex items-center gap-1.5">
                    <div className="flex gap-1">
                      <span className="h-1.5 w-1.5 bg-brand-400 rounded-full animate-bounce" />
                      <span className="h-1.5 w-1.5 bg-brand-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="h-1.5 w-1.5 bg-brand-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                    AI sedang berpikir...
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input form */}
            <form onSubmit={handleSendMessage} className="p-3 bg-surface-900 border-t border-surface-800/80">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={
                    !isPro
                      ? "Khusus Paket Pro..."
                      : chatLoading
                      ? "Harap tunggu..."
                      : "Ketik perintah (contoh: 'tambah field email')..."
                  }
                  disabled={!isPro || chatLoading}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-surface-950 border border-surface-800 text-white placeholder-surface-500 focus:outline-none focus:border-brand-500 transition text-xs disabled:opacity-40"
                />
                <button
                  type="submit"
                  disabled={!isPro || chatLoading || !chatInput.trim()}
                  className="bg-brand-600 hover:bg-brand-500 text-white p-2 rounded-xl transition flex items-center justify-center shrink-0 disabled:opacity-40 disabled:hover:bg-brand-600 cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* ─── Quota Limit / Warning Modal ─── */}
      {showQuotaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass border border-surface-800 rounded-2xl p-6 max-w-md w-full mx-4 animate-fade-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
              </div>
              <h3 className="text-lg font-bold text-white font-display">Kuota Chat Habis</h3>
            </div>
            <p className="text-xs text-surface-400 mb-6 leading-relaxed">
              Kuota chat AI di Workspace Pro Anda telah mencapai batas maksimal ({profile?.chatQuotaLimit} per bulan). Silakan hubungi admin atau upgrade paket berlangganan untuk kuota yang lebih besar.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowQuotaModal(false)} className="btn-ghost flex-1 text-xs">
                Tutup
              </button>
              <button
                onClick={() => {
                  setShowQuotaModal(false);
                  router.push("/account");
                }}
                className="btn-primary flex-1 text-xs cursor-pointer"
              >
                Upgrade Paket Akun
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Truncation Warning Modal ─── */}
      {showTruncationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass border border-surface-800 rounded-2xl p-6 max-w-md w-full mx-4 animate-fade-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
              </div>
              <h3 className="text-lg font-bold text-white font-display">Generasi Terpotong</h3>
            </div>
            <p className="text-xs text-surface-400 mb-6 leading-relaxed">
              Generate belum selesai karena limit token API. Klik tombol <strong>"Lanjutkan Penulisan"</strong> di bawah untuk otomatis menyelesaikan penulisan kode yang tersisa tanpa merusak kode sebelumnya.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowTruncationModal(false)}
                className="btn-ghost flex-1 text-xs"
              >
                Batal
              </button>
              <button
                onClick={() => handleContinueGeneration()}
                className="btn-primary flex-1 text-xs"
              >
                Lanjutkan Penulisan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResultPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ResultPageContent />
    </React.Suspense>
  );
}
