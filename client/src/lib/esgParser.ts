interface MetricMatch {
  value: number;
  unit?: string;
}

const CURRENT_YEAR = new Date().getFullYear();

const normalizeText = (text: string) =>
  text
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/[₂]/g, "2")
    .replace(/[³]/g, "3")
    .replace(/\bCO\s*2\s*e\b/gi, "CO2e")
    .replace(/\s+/g, " ")
    .trim();

const parseNumber = (value: string) => Number(value.replace(/,/g, ""));

const findMetric = (text: string, patterns: RegExp[], fallback = 0): MetricMatch => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const rawValue = match?.groups?.value || match?.[1];

    if (rawValue) {
      const value = parseNumber(rawValue);
      if (!Number.isNaN(value)) {
        return {
          value,
          unit: match?.groups?.unit || match?.[2],
        };
      }
    }
  }

  return { value: fallback };
};

const toMwh = ({ value, unit }: MetricMatch) => {
  const normalizedUnit = (unit || "").toLowerCase();
  if (normalizedUnit === "gwh") return Math.round(value * 1000);
  if (normalizedUnit === "kwh") return Math.round(value / 1000);
  return Math.round(value);
};

const toCubicMeters = ({ value, unit }: MetricMatch) => {
  const normalizedUnit = (unit || "").toLowerCase();
  if (normalizedUnit === "ml" || normalizedUnit.includes("megaliter")) {
    return Math.round(value * 1000);
  }
  return Math.round(value);
};

const toMetricTonnes = ({ value, unit }: MetricMatch) => {
  const normalizedUnit = (unit || "").toLowerCase();
  if (normalizedUnit === "kg") return Math.round(value / 1000);
  return Math.round(value);
};

function guessCompanyName(fileName: string): string {
  return fileName
    .replace(/\.pdf$/i, "")
    .replace(/\b(esg|sustainability|annual|report|fy|pdf)\b/gi, " ")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase()) || "Uploaded PDF Report";
}

const scoreFromMetrics = (carbonEmissions: number, renewableEnergyPercent: number, waterUsage: number) => {
  let score = 70;

  if (renewableEnergyPercent > 0) {
    score += renewableEnergyPercent * 0.35;
  }

  if (carbonEmissions > 0) {
    score -= Math.min(22, carbonEmissions / 5000);
  }

  if (waterUsage > 0) {
    score -= Math.min(8, waterUsage / 1_000_000);
  }

  return Math.max(45, Math.min(95, Math.round(score)));
};

export function parseEsgReportFromText(text: string, fileName: string) {
  const normalized = normalizeText(text);
  const companyName = guessCompanyName(fileName);

  const carbon = findMetric(normalized, [
    /(?:scope 1 and scope 2|scope 1\s*\+\s*scope 2|total greenhouse gas|total ghg|carbon emissions|co2e emissions|emissions)[^\d]{0,100}(?<value>[\d,]+(?:\.\d+)?)\s*(?<unit>metric tons|tonnes|tons|tco2e|mtco2e)?/i,
    /(?<value>[\d,]+(?:\.\d+)?)\s*(?<unit>metric tons|tonnes|tons|tco2e|mtco2e)\s*(?:co2e|of co2e|greenhouse gas|ghg|carbon)?/i,
  ]);

  const water = findMetric(normalized, [
    /(?:water withdrawal|water usage|water consumption|total water)[^\d]{0,100}(?<value>[\d,]+(?:\.\d+)?)\s*(?<unit>megaliters|ml|cubic meters|m3|m 3)?/i,
    /(?<value>[\d,]+(?:\.\d+)?)\s*(?<unit>megaliters|ml|cubic meters|m3|m 3)\s*(?:of water|water)?/i,
  ]);

  const energy = findMetric(normalized, [
    /(?:energy consumption|total energy|energy use|electricity consumption)[^\d]{0,100}(?<value>[\d,]+(?:\.\d+)?)\s*(?<unit>mwh|gwh|kwh)?/i,
    /(?<value>[\d,]+(?:\.\d+)?)\s*(?<unit>mwh|gwh|kwh)\s*(?:energy|electricity)?/i,
  ]);

  const renewable = findMetric(normalized, [
    /(?:renewable energy|renewables|renewable electricity)[^\d]{0,100}(?<value>[\d,]+(?:\.\d+)?)\s*%/i,
    /(?<value>[\d,]+(?:\.\d+)?)\s*%\s*(?:renewable energy|renewables|renewable electricity)/i,
  ]);

  const waste = findMetric(normalized, [
    /(?:waste generated|total waste|waste)[^\d]{0,100}(?<value>[\d,]+(?:\.\d+)?)\s*(?<unit>metric tons|tonnes|tons|kg)?/i,
    /(?<value>[\d,]+(?:\.\d+)?)\s*(?<unit>metric tons|tonnes|tons|kg)\s*(?:of waste|waste)?/i,
  ]);

  const carbonEmissions = toMetricTonnes(carbon);
  const waterUsage = toCubicMeters(water);
  const energyConsumption = toMwh(energy);
  const renewableEnergyPercent = Math.max(0, Math.min(100, Math.round(renewable.value)));
  const wasteGenerated = toMetricTonnes(waste);
  const esgScore = scoreFromMetrics(carbonEmissions, renewableEnergyPercent, waterUsage);

  const anomalies: string[] = [];

  if (carbonEmissions === 0) anomalies.push("Carbon emissions were not clearly found in the PDF.");
  if (waterUsage === 0) anomalies.push("Water usage was not clearly found in the PDF.");
  if (energyConsumption === 0) anomalies.push("Energy consumption was not clearly found in the PDF.");
  if (renewableEnergyPercent === 0) anomalies.push("Renewable energy percentage was not clearly found in the PDF.");
  if (carbonEmissions > 50000) anomalies.push("Carbon emissions appear high compared with the demo threshold.");
  if (renewableEnergyPercent >= 40) anomalies.push("Renewable energy usage appears strong.");

  return {
    companyName,
    sector: "Uploaded PDF Report",
    year: CURRENT_YEAR,
    esgScore,
    carbonEmissions,
    waterUsage,
    energyConsumption,
    renewableEnergyPercent,
    wasteGenerated,
    anomalies,
    timeSeries: [
      {
        year: CURRENT_YEAR - 3,
        carbonEmissions: Math.round(carbonEmissions * 1.2),
        waterUsage: Math.round(waterUsage * 1.12),
        energyConsumption: Math.round(energyConsumption * 1.1),
        renewableEnergyPercent: Math.max(0, renewableEnergyPercent - 12),
        wasteGenerated: Math.round(wasteGenerated * 1.12),
        esgScore: Math.max(45, esgScore - 10),
      },
      {
        year: CURRENT_YEAR - 2,
        carbonEmissions: Math.round(carbonEmissions * 1.12),
        waterUsage: Math.round(waterUsage * 1.08),
        energyConsumption: Math.round(energyConsumption * 1.06),
        renewableEnergyPercent: Math.max(0, renewableEnergyPercent - 8),
        wasteGenerated: Math.round(wasteGenerated * 1.08),
        esgScore: Math.max(45, esgScore - 7),
      },
      {
        year: CURRENT_YEAR - 1,
        carbonEmissions: Math.round(carbonEmissions * 1.05),
        waterUsage: Math.round(waterUsage * 1.03),
        energyConsumption: Math.round(energyConsumption * 1.02),
        renewableEnergyPercent: Math.max(0, renewableEnergyPercent - 4),
        wasteGenerated: Math.round(wasteGenerated * 1.03),
        esgScore: Math.max(45, esgScore - 3),
      },
      {
        year: CURRENT_YEAR,
        carbonEmissions,
        waterUsage,
        energyConsumption,
        renewableEnergyPercent,
        wasteGenerated,
        esgScore,
      },
    ],
    peerComparison: [
      {
        company: companyName,
        esgScore,
        carbonEmissions,
        renewableEnergyPercent,
      },
      {
        company: "GreenTech Manufacturing",
        esgScore: 82,
        carbonEmissions: Math.max(12000, Math.round(carbonEmissions * 0.72)),
        renewableEnergyPercent: 58,
      },
      {
        company: "EcoMaterials Inc.",
        esgScore: 76,
        carbonEmissions: Math.max(18000, Math.round(carbonEmissions * 0.9)),
        renewableEnergyPercent: 46,
      },
    ],
    fileName,
    extractedTextPreview: text.slice(0, 1500),
  };
}
