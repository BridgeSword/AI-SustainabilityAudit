import { neon } from "@neondatabase/serverless";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  }

  try {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      return res.status(500).json({
        ok: false,
        error: "DATABASE_URL is not configured",
      });
    }

    const {
      companyName,
      sector,
      year,
      esgScore,
      carbonEmissions,
      waterUsage,
      energyConsumption,
      renewableEnergyPercent,
      wasteGenerated,
      anomalies,
      timeSeries,
      peerComparison,
      fileName,
      extractedTextPreview,
    } = req.body;

    if (!companyName) {
      return res.status(400).json({
        ok: false,
        error: "companyName is required",
      });
    }

    const sql = neon(databaseUrl);
    const reportYear = year || new Date().getFullYear();

    let inserted;

    try {
      inserted = await sql`
        INSERT INTO demo_reports (
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
          extracted_text_preview
        )
        VALUES (
          ${companyName},
          ${sector || "Uploaded PDF Report"},
          ${reportYear},
          ${esgScore || 70},
          ${carbonEmissions || 0},
          ${waterUsage || 0},
          ${energyConsumption || 0},
          ${renewableEnergyPercent || 0},
          ${wasteGenerated || 0},
          ${JSON.stringify(anomalies || [])}::jsonb,
          ${JSON.stringify(timeSeries || [])}::jsonb,
          ${JSON.stringify(peerComparison || [])}::jsonb,
          ${fileName || null},
          ${extractedTextPreview || null}
        )
        RETURNING *
      `;
    } catch (error: any) {
      const message = String(error?.message || "");
      if (!message.includes("file_name") && !message.includes("extracted_text_preview")) {
        throw error;
      }

      inserted = await sql`
        INSERT INTO demo_reports (
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
          peer_comparison
        )
        VALUES (
          ${companyName},
          ${sector || "Uploaded PDF Report"},
          ${reportYear},
          ${esgScore || 70},
          ${carbonEmissions || 0},
          ${waterUsage || 0},
          ${energyConsumption || 0},
          ${renewableEnergyPercent || 0},
          ${wasteGenerated || 0},
          ${JSON.stringify(anomalies || [])}::jsonb,
          ${JSON.stringify(timeSeries || [])}::jsonb,
          ${JSON.stringify(peerComparison || [])}::jsonb
        )
        RETURNING *
      `;
    }

    return res.status(200).json({
      ok: true,
      source: "Neon",
      report: inserted[0],
    });
  } catch (error: any) {
    console.error("Failed to create report:", error);

    return res.status(500).json({
      ok: false,
      error: "Failed to create report",
      detail: error.message,
    });
  }
}
