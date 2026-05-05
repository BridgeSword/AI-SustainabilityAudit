import { mockCompanies, mockReports, type MockReport } from "@/data/mockReports";

export type ReportDataSource = "Neon" | "Mock Demo Data";

export interface DemoCompany {
  id: number;
  name: string;
  sector: string | null;
  country: string | null;
}

export interface DemoReportsDataset {
  source: ReportDataSource;
  reports: MockReport[];
  companies: DemoCompany[];
}

interface NeonReportRow {
  id?: number | string | null;
  company_id?: number | string | null;
  company_name?: string | null;
  sector?: string | null;
  country?: string | null;
  report_year?: number | string | null;
  esg_score?: number | string | null;
  carbon_emissions?: number | string | null;
  water_usage?: number | string | null;
  energy_consumption?: number | string | null;
  renewable_energy_percent?: number | string | null;
  waste_generated?: number | string | null;
  anomalies?: unknown;
  time_series?: unknown;
  peer_comparison?: unknown;
  file_name?: string | null;
  extracted_text_preview?: string | null;
}

interface NeonReportsResponse {
  ok?: boolean;
  reports?: NeonReportRow[];
}

const toNumber = (value: unknown, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const normalizeNotes = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return [value];
  }

  return [];
};

const normalizePeerComparison = (value: unknown, fallbackReport: MockReport) => {
  const peers = asArray(value)
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const renewableEnergyPercentage = toNumber(
        row.renewableEnergyPercentage ??
          row.renewableEnergyPercent ??
          row.renewable_energy_percentage ??
          row.renewable_energy_percent
      );

      return {
        company: String(row.company ?? row.companyName ?? row.company_name ?? "Peer"),
        esgScore: toNumber(row.esgScore ?? row.esg_score ?? row.score),
        carbonEmissions: toNumber(row.carbonEmissions ?? row.carbon_emissions ?? row.emissions),
        renewableEnergyPercentage,
        renewableEnergyPercent: renewableEnergyPercentage,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return peers.length
    ? peers
    : [
        {
          company: fallbackReport.companyName,
          esgScore: fallbackReport.esgScore,
          carbonEmissions: fallbackReport.carbonEmissions,
          renewableEnergyPercentage: fallbackReport.renewableEnergyPercentage,
          renewableEnergyPercent: fallbackReport.renewableEnergyPercentage,
        },
      ];
};

const normalizeTimeSeries = (value: unknown, fallbackReport: MockReport) => {
  const rows = asArray(value)
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const energyUsage = toNumber(
        row.energyUsage ?? row.energyConsumption ?? row.energy_consumption ?? row.energy_consumption_mwh
      );
      const renewableEnergyPercentage = toNumber(
        row.renewableEnergyPercentage ??
          row.renewableEnergyPercent ??
          row.renewable_energy_percentage ??
          row.renewable_energy_percent
      );

      return {
        year: toNumber(row.year ?? row.report_year),
        esgScore: toNumber(row.esgScore ?? row.esg_score),
        carbonEmissions: toNumber(row.carbonEmissions ?? row.carbon_emissions ?? row.ghg_emissions ?? row.emissions),
        waterUsage: toNumber(row.waterUsage ?? row.water_usage ?? row.water_withdrawal_m3),
        energyUsage,
        energyConsumption: energyUsage,
        renewableEnergyPercentage,
        renewableEnergyPercent: renewableEnergyPercentage,
        wasteGenerated: toNumber(row.wasteGenerated ?? row.waste_generated ?? row.waste_generated_tonnes),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null && item.year > 0);

  return rows.length
    ? rows
    : [
        {
          year: fallbackReport.year,
          esgScore: fallbackReport.esgScore,
          carbonEmissions: fallbackReport.carbonEmissions,
          waterUsage: fallbackReport.waterUsage,
          energyUsage: fallbackReport.energyUsage,
          energyConsumption: fallbackReport.energyUsage,
          renewableEnergyPercentage: fallbackReport.renewableEnergyPercentage,
          renewableEnergyPercent: fallbackReport.renewableEnergyPercentage,
          wasteGenerated: fallbackReport.wasteGenerated,
        },
      ];
};

const buildCompanies = (reports: MockReport[]): DemoCompany[] => {
  const companies = new Map<number, DemoCompany>();

  reports.forEach((report) => {
    if (!companies.has(report.companyId)) {
      companies.set(report.companyId, {
        id: report.companyId,
        name: report.companyName,
        sector: report.sector,
        country: report.country,
      });
    }
  });

  return Array.from(companies.values());
};

export const getMockDemoReportsDataset = (): DemoReportsDataset => ({
  source: "Mock Demo Data",
  reports: mockReports.map((report) => ({
    ...report,
    energyConsumption: report.energyUsage,
    renewableEnergyPercent: report.renewableEnergyPercentage,
    peerComparison: mockReports.map((peer) => ({
      company: peer.companyName,
      esgScore: peer.esgScore,
      carbonEmissions: peer.carbonEmissions,
      renewableEnergyPercentage: peer.renewableEnergyPercentage,
      renewableEnergyPercent: peer.renewableEnergyPercentage,
    })),
    timeSeries: report.timeSeries.map((point) => ({
      ...point,
      energyConsumption: point.energyUsage,
      renewableEnergyPercent: point.renewableEnergyPercentage,
    })),
  })),
  companies: mockCompanies.map((company) => ({
    id: company.id,
    name: company.name,
    sector: company.sector,
    country: company.country,
  })),
});

const normalizeNeonReports = (rows: NeonReportRow[]): MockReport[] => {
  const companyIds = new Map<string, number>();

  return rows.map((row, index) => {
    const companyName = String(row.company_name || `Company ${index + 1}`);
    const companyId =
      toNumber(row.company_id) ||
      companyIds.get(companyName) ||
      101 + companyIds.size;
    companyIds.set(companyName, companyId);

    const energyUsage = toNumber(row.energy_consumption);
    const renewableEnergyPercentage = toNumber(row.renewable_energy_percent);
    const report: MockReport = {
      id: toNumber(row.id, 10000 + index),
      companyId,
      companyName,
      sector: row.sector || "Unspecified",
      country: row.country || "",
      year: toNumber(row.report_year),
      esgScore: toNumber(row.esg_score),
      carbonEmissions: toNumber(row.carbon_emissions),
      waterUsage: toNumber(row.water_usage),
      energyUsage,
      energyConsumption: energyUsage,
      renewableEnergyPercentage,
      renewableEnergyPercent: renewableEnergyPercentage,
      wasteGenerated: toNumber(row.waste_generated),
      anomalyNotes: normalizeNotes(row.anomalies),
      fileName: row.file_name || `${companyName.replace(/\s+/g, "-")}-${row.report_year || "ESG"}-Report.pdf`,
      timeSeries: [],
      peerComparison: [],
    };

    report.timeSeries = normalizeTimeSeries(row.time_series, report);
    report.peerComparison = normalizePeerComparison(row.peer_comparison, report);

    return report;
  });
};

export async function fetchDemoReportsDataset(): Promise<DemoReportsDataset> {
  try {
    const response = await fetch("/api/reports");
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as NeonReportsResponse;
    if (payload.ok === false || !Array.isArray(payload.reports) || payload.reports.length === 0) {
      return getMockDemoReportsDataset();
    }

    const reports = normalizeNeonReports(payload.reports);
    if (reports.length === 0) {
      return getMockDemoReportsDataset();
    }

    return {
      source: "Neon",
      reports,
      companies: buildCompanies(reports),
    };
  } catch {
    return getMockDemoReportsDataset();
  }
}
