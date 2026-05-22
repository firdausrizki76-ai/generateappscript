import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    // 1. Get session token from Authorization header
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Autentikasi diperlukan. Silakan login kembali." },
        { status: 401 }
      );
    }

    // 2. Initialize request-scoped Supabase client for user verification
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

    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Sesi tidak valid atau telah berakhir." },
        { status: 401 }
      );
    }

    // 3. Parse and validate requested plan
    const { plan } = await req.json();
    if (plan !== "pro" && plan !== "business") {
      return NextResponse.json(
        { success: false, error: "Paket langganan tidak valid." },
        { status: 400 }
      );
    }

    // Determine prices (Pro: Rp 60.000, Business: Rp 150.000)
    const priceMap: Record<"pro" | "business", number> = {
      pro: 60000,
      business: 150000,
    };
    const amount = priceMap[plan as "pro" | "business"];

    // Generate unique order ID
    const orderId = `SUB-${user.id.substring(0, 8)}-${Date.now()}`;

    // 4. Request transaction token from Midtrans Snap API
    const isProduction = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true";
    const midtransUrl = isProduction
      ? "https://app.midtrans.com/snap/v1/transactions"
      : "https://app.sandbox.midtrans.com/snap/v1/transactions";

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) {
      return NextResponse.json(
        { success: false, error: "Konfigurasi Midtrans Server Key belum diatur di server." },
        { status: 500 }
      );
    }

    const authString = Buffer.from(`${serverKey}:`).toString("base64");

    const midtransRes = await fetch(midtransUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Basic ${authString}`,
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: orderId,
          gross_amount: amount,
        },
        customer_details: {
          email: user.email,
          first_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
        },
        item_details: [
          {
            id: plan,
            price: amount,
            quantity: 1,
            name: `Paket Subscription ${plan.toUpperCase()}`,
          },
        ],
      }),
    });

    if (!midtransRes.ok) {
      const errText = await midtransRes.text();
      console.error("Midtrans API response error:", errText);
      return NextResponse.json(
        { success: false, error: "Gagal membuat transaksi ke Midtrans." },
        { status: 500 }
      );
    }

    const midtransData = await midtransRes.json();

    // 5. Save pending subscription record using Admin Supabase client (bypassing RLS)
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseServiceRoleKey) {
      return NextResponse.json(
        { success: false, error: "Konfigurasi Supabase Service Role Key belum diatur di server." },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
      },
    });

    const { error: dbError } = await supabaseAdmin.from("subscriptions").insert({
      user_id: user.id,
      plan: plan,
      status: "pending",
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Set default 30 days
      midtrans_order_id: orderId,
    });

    if (dbError) {
      console.error("Error inserting subscription to DB:", dbError);
      return NextResponse.json(
        { success: false, error: "Gagal mendaftarkan transaksi ke database." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      token: midtransData.token,
      redirectUrl: midtransData.redirect_url,
      orderId,
    });
  } catch (error: any) {
    console.error("Subscription create error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Terjadi kesalahan internal." },
      { status: 500 }
    );
  }
}
