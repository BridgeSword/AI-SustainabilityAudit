export interface MockReport {
  id: number;
  companyId: number;
  companyName: string;
  sector: string;
  country: string;
  year: number;
  esgScore: number;
  carbonEmissions: number;
  waterUsage: number;
  energyUsage: number;
  renewableEnergyPercentage: number;
  wasteGenerated: number;
  anomalyNotes: string[];
  fileName: string;
  timeSeries: Array<{
    year: number;
    esgScore: number;
    carbonEmissions: number;
    waterUsage: number;
    energyUsage: number;
    renewableEnergyPercentage: number;
    wasteGenerated: number;
  }>;
}

export const mockReports: MockReport[] = [
  {
    id: 9001,
    companyId: 101,
    companyName: "Northstar Semiconductors",
    sector: "Technology",
    country: "United States",
    year: 2025,
    esgScore: 84,
    carbonEmissions: 248000,
    waterUsage: 1450000,
    energyUsage: 980000,
    renewableEnergyPercentage: 62,
    wasteGenerated: 12800,
    anomalyNotes: [
      "Scope 2 emissions fell faster than production volume, consistent with new renewable power purchase agreements.",
      "Water withdrawal increased 9% year over year after a fabrication line expansion in Arizona.",
      "Hazardous waste intensity remained above the sector target despite improved recycling rates.",
    ],
    fileName: "Northstar-Semiconductors-2025-ESG-Report.pdf",
    timeSeries: [
      {
        year: 2022,
        esgScore: 72,
        carbonEmissions: 318000,
        waterUsage: 1210000,
        energyUsage: 1040000,
        renewableEnergyPercentage: 38,
        wasteGenerated: 15100,
      },
      {
        year: 2023,
        esgScore: 77,
        carbonEmissions: 291000,
        waterUsage: 1285000,
        energyUsage: 1015000,
        renewableEnergyPercentage: 47,
        wasteGenerated: 14200,
      },
      {
        year: 2024,
        esgScore: 81,
        carbonEmissions: 263000,
        waterUsage: 1330000,
        energyUsage: 995000,
        renewableEnergyPercentage: 56,
        wasteGenerated: 13400,
      },
      {
        year: 2025,
        esgScore: 84,
        carbonEmissions: 248000,
        waterUsage: 1450000,
        energyUsage: 980000,
        renewableEnergyPercentage: 62,
        wasteGenerated: 12800,
      },
    ],
  },
  {
    id: 9002,
    companyId: 102,
    companyName: "Evergreen Foods Group",
    sector: "Consumer Goods",
    country: "Canada",
    year: 2025,
    esgScore: 78,
    carbonEmissions: 182000,
    waterUsage: 2140000,
    energyUsage: 620000,
    renewableEnergyPercentage: 49,
    wasteGenerated: 23600,
    anomalyNotes: [
      "Water usage remains high relative to revenue because of drought-year irrigation at two supplier farms.",
      "Organic waste diversion improved after new composting contracts, reducing landfill waste by 18%.",
      "Fleet emissions rose slightly as cold-chain distribution expanded into the western region.",
    ],
    fileName: "Evergreen-Foods-Group-2025-Sustainability-Report.pdf",
    timeSeries: [
      {
        year: 2022,
        esgScore: 68,
        carbonEmissions: 211000,
        waterUsage: 2320000,
        energyUsage: 690000,
        renewableEnergyPercentage: 29,
        wasteGenerated: 31200,
      },
      {
        year: 2023,
        esgScore: 72,
        carbonEmissions: 199000,
        waterUsage: 2250000,
        energyUsage: 662000,
        renewableEnergyPercentage: 36,
        wasteGenerated: 28700,
      },
      {
        year: 2024,
        esgScore: 75,
        carbonEmissions: 188000,
        waterUsage: 2180000,
        energyUsage: 641000,
        renewableEnergyPercentage: 43,
        wasteGenerated: 25100,
      },
      {
        year: 2025,
        esgScore: 78,
        carbonEmissions: 182000,
        waterUsage: 2140000,
        energyUsage: 620000,
        renewableEnergyPercentage: 49,
        wasteGenerated: 23600,
      },
    ],
  },
];

export const mockCompanies = mockReports.map((report) => ({
  id: report.companyId,
  name: report.companyName,
  sector: report.sector,
  country: report.country,
}));
