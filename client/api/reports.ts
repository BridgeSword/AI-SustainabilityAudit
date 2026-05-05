import { neon } from "@neondatabase/serverless";

export default async function handler(req: any, res: any) {
  try {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      return res.status(500).json({
        ok: false,
        error: "DATABASE_URL is not configured",
      });
    }

    const sql = neon(databaseUrl);

    let reports;

    try {
      reports = await sql`
        SELECT
          id,
          company_name,
          sector,
          report_year,
          esg_score,
          carbon_emissions,
          water_usage,
          energy_consumption,
          renewable_energy_percent,
          waste_generated,
          anomalies,
          time_series,
          peer_comparison,
          file_name,
          extracted_text_preview,
          created_at
        FROM demo_reports
        ORDER BY report_year DESC, esg_score DESC
      `;
    } catch (error: any) {
      const message = String(error?.message || "");
      if (!message.includes("file_name") && !message.includes("extracted_text_preview")) {
        throw error;
      }

      reports = await sql`
        SELECT
          id,
          company_name,
          sector,
          report_year,
          esg_score,
          carbon_emissions,
          water_usage,
          energy_consumption,
          renewable_energy_percent,
          waste_generated,
          anomalies,
          time_series,
          peer_comparison,
          created_at
        FROM demo_reports
        ORDER BY report_year DESC, esg_score DESC
      `;
    }

    return res.status(200).json({
      ok: true,
      source: "Neon",
      reports,
    });
  } catch (error: any) {
    console.error("Failed to fetch reports from Neon:", error);

    return res.status(500).json({
      ok: false,
      error: "Failed to fetch reports from Neon",
      detail: error.message,
    });
  }
}
