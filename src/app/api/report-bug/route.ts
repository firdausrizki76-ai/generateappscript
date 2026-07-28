import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    
    // Target email yang ditentukan
    const targetEmail = "firdausrizki76@gmail.com";
    const submitUrl = `https://formsubmit.co/ajax/${targetEmail}`;

    // Siapkan FormData bersih untuk dikirim ke FormSubmit
    const forwardData = new FormData();
    
    const title = formData.get("title")?.toString() || "Laporan Bug";
    const description = formData.get("description")?.toString() || "";
    const email = formData.get("email")?.toString() || "no-reply@appscriptgenerator.id";
    const name = formData.get("name")?.toString() || "Pengguna AppScript Generator";
    const pageUrl = formData.get("page_url")?.toString() || "";
    const userAgent = formData.get("user_agent")?.toString() || "";
    const photo = formData.get("attachment") as File | null;

    forwardData.append("name", name);
    forwardData.append("email", email);
    forwardData.append("_subject", `🚨 [BUG REPORT] ${title}`);
    forwardData.append("_template", "table");
    forwardData.append("_captcha", "false");
    forwardData.append("Judul Bug", title);
    forwardData.append("Deskripsi Bug", description);
    if (pageUrl) forwardData.append("Halaman URL", pageUrl);
    forwardData.append("Waktu Laporan", new Date().toLocaleString("id-ID"));
    if (userAgent) forwardData.append("User Agent", userAgent);

    if (photo && photo.size > 0) {
      forwardData.append("attachment", photo, photo.name || "screenshot-bug.png");
    }

    const response = await fetch(submitUrl, {
      method: "POST",
      body: forwardData,
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { success: false, error: "Gagal mengirim ke server email", details: errText },
        { status: response.status }
      );
    }

    const resultData = await response.json().catch(() => ({ success: true }));

    return NextResponse.json({
      success: true,
      message: "Laporan bug dan foto berhasil dikirim ke email firdausrizki76@gmail.com",
      data: resultData,
    });
  } catch (error: any) {
    console.error("Error in /api/report-bug:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Terjadi kesalahan internal server saat mengirim laporan",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
