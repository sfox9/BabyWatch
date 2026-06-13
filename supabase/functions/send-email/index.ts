// BabyWatch email notifications — Supabase Edge Function.
// Sends email through Resend (resend.com). If RESEND_API_KEY is not set,
// it does nothing (the in-app notification bell still works).
//
// HOW TO DEPLOY (no command line needed):
//   Supabase dashboard -> Edge Functions -> Deploy a new function ->
//   name it exactly: send-email -> paste this file -> Deploy.
//   Then: Edge Functions -> Secrets -> add RESEND_API_KEY = your Resend key.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to, subject, text } = await req.json();
    const key = Deno.env.get("RESEND_API_KEY");

    if (!key) {
      return new Response(JSON.stringify({ sent: false, reason: "RESEND_API_KEY not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Array.isArray(to) || to.length === 0) {
      return new Response(JSON.stringify({ sent: false, reason: "no recipients" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const from = Deno.env.get("BABYWATCH_FROM") || "BabyWatch <onboarding@resend.dev>";
    const html = `
      <div style="font-family: Georgia, serif; background:#F7F2EC; padding:32px;">
        <div style="max-width:480px; margin:0 auto; background:#FEFCF8; border-radius:16px; padding:28px; border:1px solid #D9CFC4;">
          <h2 style="color:#6B4F3A; margin:0 0 12px;">BabyWatch</h2>
          <p style="color:#3D2B1F; font-size:15px; line-height:1.6; margin:0 0 16px;">${text}</p>
          <p style="color:#8B7355; font-size:12px; margin:0;">Open the BabyWatch app to respond.</p>
        </div>
      </div>`;

    // Resend allows up to 50 recipients per call; send individually so one
    // bad address doesn't block the rest.
    const results = await Promise.allSettled(
      to.map((recipient: string) =>
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from, to: [recipient], subject: subject || "BabyWatch update", html }),
        })
      )
    );
    const sent = results.filter((r) => r.status === "fulfilled" && (r.value as Response).ok).length;

    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
