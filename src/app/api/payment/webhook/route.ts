import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
    } = body;

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) {
      return NextResponse.json(
        { success: false, error: "Konfigurasi Midtrans Server Key belum diatur." },
        { status: 500 }
      );
    }

    // 1. Verify Midtrans Signature Key authenticity
    // Signature key formula: SHA512(order_id + status_code + gross_amount + ServerKey)
    const rawSignaturePayload = order_id + status_code + gross_amount + serverKey;
    const computedSignature = crypto
      .createHash("sha512")
      .update(rawSignaturePayload)
      .digest("hex");

    if (computedSignature !== signature_key) {
      console.warn("Invalid webhook signature key from Midtrans. Computed:", computedSignature, "Received:", signature_key);
      return NextResponse.json(
        { success: false, error: "Autentikasi signature tidak valid." },
        { status: 401 }
      );
    }

    // 2. Initialize Admin Supabase Client to update tables bypassing RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceRoleKey) {
      return NextResponse.json(
        { success: false, error: "Konfigurasi Supabase Service Role Key belum diatur." },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
      },
    });

    // 3. Find the associated subscription in database
    const { data: subscription, error: fetchError } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("midtrans_order_id", order_id)
      .single();

    if (fetchError || !subscription) {
      console.error("Subscription record not found for order:", order_id, fetchError);
      return NextResponse.json(
        { success: false, error: "Transaksi tidak terdaftar di database." },
        { status: 404 }
      );
    }

    // 4. Process statuses
    // Success conditions: 'settlement' or 'capture' with fraud status 'accept'
    const isSuccess =
      transaction_status === "settlement" ||
      (transaction_status === "capture" && fraud_status === "accept");

    const isFailure = ["deny", "cancel", "expire"].includes(transaction_status);

    if (isSuccess) {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days validation

      // A. Update subscription record status to active
      const { error: subUpdateError } = await supabaseAdmin
        .from("subscriptions")
        .update({
          status: "active",
          started_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        })
        .eq("midtrans_order_id", order_id);

      if (subUpdateError) {
        console.error("Failed to update subscription status:", subUpdateError);
        return NextResponse.json({ success: false, error: "Gagal memperbarui status transaksi." }, { status: 500 });
      }

      // B. Update profile plan status
      const { error: profileUpdateError } = await supabaseAdmin
        .from("profiles")
        .update({
          plan: subscription.plan,
        })
        .eq("id", subscription.user_id);

      if (profileUpdateError) {
        console.error("Failed to update profile plan:", profileUpdateError);
        return NextResponse.json({ success: false, error: "Gagal memperbarui profil pengguna." }, { status: 500 });
      }

      // C. Reset/Insert quota limit for the subscription cycle
      const cycleId = `sub-${subscription.id}`;
      const PLAN_LIMITS: Record<string, number> = { pro: 10, business: 30 };
      const CHAT_LIMITS: Record<string, number> = { pro: 50, business: 150 };
      const userPlan = subscription.plan;

      const { error: quotaError } = await supabaseAdmin
        .from("quota_usage")
        .upsert(
          {
            user_id: subscription.user_id,
            month: cycleId,
            limit: PLAN_LIMITS[userPlan] || 1,
            chat_limit: CHAT_LIMITS[userPlan] || 0,
            used: 0,
            chat_used: 0,
            updated_at: now.toISOString(),
          },
          {
            onConflict: "user_id,month",
          }
        );

      if (quotaError) {
        console.error("Failed to update user quota usage limits:", quotaError);
        return NextResponse.json({ success: false, error: "Gagal memperbarui kuota pengguna." }, { status: 500 });
      }

      console.log(`Payment successful for Order: ${order_id}. Plan ${userPlan} activated.`);
    } else if (isFailure) {
      // Update subscription to cancelled
      await supabaseAdmin
        .from("subscriptions")
        .update({
          status: "cancelled",
        })
        .eq("midtrans_order_id", order_id);

      console.log(`Payment failed/expired for Order: ${order_id}. Subscription set to cancelled.`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Terjadi kesalahan internal." },
      { status: 500 }
    );
  }
}
