import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/layout/Navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpDown, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SectorRankingChat from "@/components/sector-ranking/SectorRankingChat";
import { listCompanies, listReports, type ApiCompany, type ApiReport } from "@/lib/api";

type SortField = "name" | "industry" | "ghg_emissions" | "report_year";
type SortDirection = "asc" | "desc";

interface Company {
  id: number;
  name: string;
  industry: string;
  country: string;
}

interface Report {
  id: number;
  company_id: number;
  report_year: number;
  ghg_emissions: number | null;
  report_data: Record<string, unknown>;
  company?: Company;
}

const normalizeCompany = (company: ApiCompany): Company => ({
  id: company.id,
  name: company.name,
  industry: company.sector || "",
  country: company.country || "",
});

const normalizeReport = (report: ApiReport): Report | null => {
  if (!report.company_id) return null;

  return {
    id: report.id,
    company_id: report.company_id,
    report_year: report.year,
    ghg_emissions: Number(report.extracted_json?.ghg_emissions) || null,
    report_data: report.extracted_json || {},
  };
};

const SectorRanking = () => {
  const { toast } = useToast();
  const [nameSearch, setNameSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [scaleFilter, setScaleFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<number[]>([]);
  const [baseline, setBaseline] = useState<number[]>([]);
  const [sortField, setSortField] = useState<SortField>("ghg_emissions");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const stored = localStorage.getItem("sector-ranking-baseline");
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setBaseline(parsed.map(Number).filter((id) => Number.isFinite(id)));
      }
    } catch {
      localStorage.removeItem("sector-ranking-baseline");
    }
  }, []);

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => (await listCompanies()).map(normalizeCompany),
  });

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: async () =>
      (await listReports())
        .map(normalizeReport)
        .filter((report): report is Report => report !== null),
  });

  const enrichedReports = useMemo(() => {
    const companyMap = new Map(companies.map((company) => [company.id, company]));
    return reports.map((report) => ({
      ...report,
      company: companyMap.get(report.company_id),
    }));
  }, [reports, companies]);

  const industries = useMemo(
    () => Array.from(new Set(companies.map((company) => company.industry).filter(Boolean))),
    [companies]
  );

  const countries = useMemo(
    () => Array.from(new Set(companies.map((company) => company.country).filter(Boolean))),
    [companies]
  );

  const years = useMemo(
    () => Array.from(new Set(reports.map((report) => report.report_year))).sort((a, b) => b - a),
    [reports]
  );

  const filteredReports = useMemo(() => {
    const filtered = enrichedReports.filter((report) => {
      const company = report.company;
      const companyName = company?.name || "";
      const industry = company?.industry || "";
      const country = company?.country || "";

      return (
        (!nameSearch || companyName.toLowerCase().includes(nameSearch.toLowerCase())) &&
        (industryFilter === "all" || industry === industryFilter) &&
        (countryFilter === "all" || country === countryFilter) &&
        (yearFilter === "all" || report.report_year === Number(yearFilter))
      );
    });

    filtered.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      if (sortField === "name") {
        aVal = a.company?.name || "";
        bVal = b.company?.name || "";
      } else if (sortField === "industry") {
        aVal = a.company?.industry || "";
        bVal = b.company?.industry || "";
      } else if (sortField === "ghg_emissions") {
        aVal = a.ghg_emissions || 0;
        bVal = b.ghg_emissions || 0;
      } else {
        aVal = a.report_year;
        bVal = b.report_year;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [
    enrichedReports,
    nameSearch,
    industryFilter,
    countryFilter,
    yearFilter,
    sortField,
    sortDirection,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [nameSearch, industryFilter, regionFilter, scaleFilter, countryFilter, yearFilter]);

  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredReports.slice(start, start + itemsPerPage);
  }, [filteredReports, currentPage]);

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleSelectPage = () => {
    const pageIds = paginatedReports.map((report) => report.company_id);
    setSelectedCompanyIds((prev) => Array.from(new Set([...prev, ...pageIds])));
  };

  const handleUnselectPage = () => {
    const pageIds = new Set(paginatedReports.map((report) => report.company_id));
    setSelectedCompanyIds((prev) => prev.filter((id) => !pageIds.has(id)));
  };

  const handleAddBaseline = () => {
    const nextBaseline = Array.from(new Set([...baseline, ...selectedCompanyIds]));
    setBaseline(nextBaseline);
    localStorage.setItem("sector-ranking-baseline", JSON.stringify(nextBaseline));
    toast({
      title: "Baseline Updated",
      description: `${selectedCompanyIds.length} companies added to baseline.`,
    });
  };

  const handleCompareSelected = () => {
    if (selectedCompanyIds.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select companies to compare.",
        variant: "destructive",
      });
      return;
    }

    const selectedReports = enrichedReports.filter((report) =>
      selectedCompanyIds.includes(report.company_id)
    );
    const reportsWithEmissions = selectedReports.filter(
      (report) => report.ghg_emissions != null
    );

    if (reportsWithEmissions.length === 0) {
      toast({
        title: "No Emissions Data",
        description: "Selected companies do not have emissions values yet.",
        variant: "destructive",
      });
      return;
    }

    const best = reportsWithEmissions.reduce((min, report) =>
      (report.ghg_emissions || 0) < (min.ghg_emissions || 0) ? report : min
    );
    const worst = reportsWithEmissions.reduce((max, report) =>
      (report.ghg_emissions || 0) > (max.ghg_emissions || 0) ? report : max
    );

    toast({
      title: "Comparison Result",
      description: `Best: ${best.company?.name || "Unknown"} (${best.ghg_emissions} tCO2e). Worst: ${
        worst.company?.name || "Unknown"
      } (${worst.ghg_emissions} tCO2e).`,
    });
  };

  const handleToggleSelect = (companyId: number) => {
    setSelectedCompanyIds((prev) =>
      prev.includes(companyId) ? prev.filter((id) => id !== companyId) : [...prev, companyId]
    );
  };

  const externalContext = useMemo(() => {
    const selected = enrichedReports.filter((report) =>
      selectedCompanyIds.includes(report.company_id)
    );

    return {
      filters: {
        nameSearch,
        industry: industryFilter,
        region: regionFilter,
        scale: scaleFilter,
        country: countryFilter,
        year: yearFilter,
      },
      selectedCompanies: selected.map((report) => ({
        name: report.company?.name,
        industry: report.company?.industry,
        country: report.company?.country,
        year: report.report_year,
        emissions: report.ghg_emissions,
      })),
      baseline,
    };
  }, [
    enrichedReports,
    selectedCompanyIds,
    nameSearch,
    industryFilter,
    regionFilter,
    scaleFilter,
    countryFilter,
    yearFilter,
    baseline,
  ]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="mb-2 text-3xl font-bold text-foreground">Sector analysis</h1>
          <p className="text-muted-foreground">
            Compare companies by emissions, select baselines, and analyze with AI.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Input
                  placeholder="Search by name..."
                  value={nameSearch}
                  onChange={(event) => setNameSearch(event.target.value)}
                />

                <Select value={industryFilter} onValueChange={setIndustryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Industries</SelectItem>
                    {industries.map((industry) => (
                      <SelectItem key={industry} value={industry}>
                        {industry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={regionFilter} onValueChange={setRegionFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={scaleFilter} onValueChange={setScaleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Scale" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Scales</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    {countries.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSelectPage} variant="outline" size="sm">
                Select Page
              </Button>
              <Button onClick={handleUnselectPage} variant="outline" size="sm">
                Unselect Page
              </Button>
              <Button onClick={() => setSelectedCompanyIds([])} variant="outline" size="sm">
                Clear Selection
              </Button>
              <Button onClick={handleAddBaseline} variant="secondary" size="sm">
                Add Baseline
              </Button>
              <Button onClick={handleCompareSelected} size="sm">
                <TrendingUp className="mr-2 h-4 w-4" />
                Compare Selected
              </Button>
            </div>

            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Select</TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleSort("name")}>
                        Company
                        <ArrowUpDown className="ml-1 h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleSort("industry")}>
                        Industry
                        <ArrowUpDown className="ml-1 h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleSort("report_year")}>
                        Year
                        <ArrowUpDown className="ml-1 h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleSort("ghg_emissions")}>
                        Emissions (tCO2e)
                        <ArrowUpDown className="ml-1 h-3 w-3" />
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Skeleton className="h-4 w-4" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : paginatedReports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        No reports found matching your filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedCompanyIds.includes(report.company_id)}
                            onCheckedChange={() => handleToggleSelect(report.company_id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {report.company?.name || "Unknown"}
                        </TableCell>
                        <TableCell>{report.company?.industry || "-"}</TableCell>
                        <TableCell>{report.report_year}</TableCell>
                        <TableCell>
                          {report.ghg_emissions != null
                            ? report.ghg_emissions.toLocaleString()
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages} ({filteredReports.length} total)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((page) => page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((page) => page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <SectorRankingChat externalContext={externalContext} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default SectorRanking;
