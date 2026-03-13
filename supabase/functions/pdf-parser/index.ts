import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Convert Uint8Array to base64 in chunks to avoid stack overflow
function uint8ToBase64(bytes: Uint8Array): string {
  const CHUNK = 8192;
  let result = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const chunk = bytes.subarray(i, i + CHUNK);
    result += String.fromCharCode(...chunk);
  }
  return btoa(result);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const { fileId, storagePath, fileName } = await req.json();
    if (!fileId || !storagePath) {
      return new Response(JSON.stringify({ error: "fileId and storagePath are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await adminClient.from("uploaded_files").update({ status: "processing" }).eq("id", fileId);

    // Get signed URL for the PDF
    const { data: urlData, error: urlError } = await adminClient.storage
      .from("financial-documents")
      .createSignedUrl(storagePath, 600);

    if (urlError || !urlData?.signedUrl) {
      await adminClient.from("uploaded_files").update({
        status: "failed",
        error_message: "Could not access file",
        updated_at: new Date().toISOString(),
      }).eq("id", fileId);
      throw new Error("Could not create signed URL");
    }

    // Download the PDF
    const pdfResponse = await fetch(urlData.signedUrl);
    if (!pdfResponse.ok) throw new Error("Failed to download PDF");
    const pdfBytes = new Uint8Array(await pdfResponse.arrayBuffer());

    // Check size (5MB limit)
    if (pdfBytes.length > 5 * 1024 * 1024) {
      await adminClient.from("uploaded_files").update({
        status: "failed",
        error_message: "Documento muito grande. Máximo 5MB.",
        updated_at: new Date().toISOString(),
      }).eq("id", fileId);
      return new Response(JSON.stringify({ error: "Documento muito grande. Máximo 5MB." }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pdfBase64 = uint8ToBase64(pdfBytes);

    // Call Gemini API
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const prompt = `Analyze this financial document (bank statement, credit card bill, or receipt) and extract ALL transactions.

Return ONLY a valid JSON array of transactions. Each transaction must have:
- "date": string in "YYYY-MM-DD" format
- "merchant": string (merchant/store name, clean and normalized)
- "amount": number (positive value, no currency symbols)
- "category": one of ["Shopping", "Food", "Transport", "Utilities", "Entertainment", "Health", "Education", "Travel", "Services", "Other"]
- "description": string (brief description if available, otherwise empty string)

Rules:
- Extract ONLY actual transactions/purchases/payments
- Ignore informational headers, totals, interest rates, limits
- For credit card bills, use the purchase date, not the billing date
- Convert all amounts to positive numbers
- If a date has only DD/MM, infer the year from the document context
- Clean merchant names (remove extra codes, normalize capitalization)

Return ONLY the JSON array, no markdown, no explanation.`;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 32768,
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error("Gemini error:", geminiResponse.status, errText);
      await adminClient.from("uploaded_files").update({
        status: "failed",
        error_message: "AI processing failed",
        updated_at: new Date().toISOString(),
      }).eq("id", fileId);
      throw new Error("Gemini API error");
    }

    const geminiData = await geminiResponse.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Extract JSON from response using string methods (no regex literals)
    let transactions: Array<{
      date: string;
      merchant: string;
      amount: number;
      category: string;
      description: string;
    }> = [];

    try {
      let jsonStr = rawText.trim();
      const startIdx = jsonStr.indexOf("[");
      const endIdx = jsonStr.lastIndexOf("]");
      if (startIdx !== -1 && endIdx !== -1) {
        jsonStr = jsonStr.substring(startIdx, endIdx + 1);
      }
      transactions = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse Gemini response:", rawText.substring(0, 500));
      await adminClient.from("uploaded_files").update({
        status: "failed",
        error_message: "Failed to parse AI response",
        updated_at: new Date().toISOString(),
      }).eq("id", fileId);
      return new Response(JSON.stringify({ error: "Failed to parse transactions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!Array.isArray(transactions) || transactions.length === 0) {
      await adminClient.from("uploaded_files").update({
        status: "completed",
        transactions_count: 0,
        updated_at: new Date().toISOString(),
      }).eq("id", fileId);
      return new Response(JSON.stringify({ success: true, transactionsCount: 0, transactions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert transactions
    const validCategories = ["Shopping", "Food", "Transport", "Utilities", "Entertainment", "Health", "Education", "Travel", "Services", "Other"];
    const rows = transactions.map((t) => ({
      user_id: userId,
      file_id: fileId,
      merchant: (t.merchant || "Unknown").substring(0, 200),
      amount: Math.abs(Number(t.amount) || 0),
      category: validCategories.includes(t.category) ? t.category : "Other",
      transaction_date: t.date || new Date().toISOString().split("T")[0],
      description: (t.description || "").substring(0, 500),
      source: "pdf_upload",
    }));

    const { error: insertError } = await adminClient.from("transactions").insert(rows);
    if (insertError) {
      console.error("Insert error:", insertError);
      await adminClient.from("uploaded_files").update({
        status: "failed",
        error_message: "Failed to save transactions",
        updated_at: new Date().toISOString(),
      }).eq("id", fileId);
      throw new Error("Failed to insert transactions");
    }

    await adminClient.from("uploaded_files").update({
      status: "completed",
      transactions_count: rows.length,
      updated_at: new Date().toISOString(),
    }).eq("id", fileId);

    return new Response(
      JSON.stringify({ success: true, transactionsCount: rows.length, transactions: rows }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("pdf-parser error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
