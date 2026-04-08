import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyId, message } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch company and its reports
    const { data: company } = await supabase
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .single();

    const { data: reports } = await supabase
      .from("sustainability_reports")
      .select("*")
      .eq("company_id", companyId)
      .order("report_year", { ascending: true });

    // Build context from reports
    const reportsContext = reports?.map(r => 
      `Year ${r.report_year}: ${r.ghg_emissions} tCO₂e emissions${r.report_data ? `, Additional data: ${JSON.stringify(r.report_data)}` : ''}`
    ).join("\n") || "No reports available.";

    const systemPrompt = `You are a sustainability analyst assistant. You have access to ${company?.name}'s sustainability reports data. 
    
Company: ${company?.name}
Industry: ${company?.industry || "Not specified"}

Available Reports:
${reportsContext}

Answer questions about this company's sustainability performance, emissions trends, and environmental impact based on the available data. Be specific and cite the data when possible.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in company-reports-chat:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
