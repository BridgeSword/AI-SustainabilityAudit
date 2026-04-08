import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/layout/Navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpDown, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SectorRankingChat from "@/components/sector-ranking/SectorRankingChat";

type SortField = "name" | "industry" | "ghg_emissions" | "report_year";
type SortDirection = "asc" | "desc";

interface Company {
  id: string;
  name: string;
  industry: string;
}

interface Report {
  id: string;
  company_id: string;
  report_year: number;
  ghg_emissions: number;
  report_data: any;
}

interface EnrichedReport extends Report {
  company?: Company;
}

const SectorRanking = () => {
  const { toast } = useToast();
  const [nameSearch, setNameSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [scaleFilter, setScaleFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [baseline, setBaseline] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>("ghg_emissions");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Load baseline from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("sector-ranking-baseline");
    if (stored) {
      try {
        setBaseline(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse baseline from localStorage", e);
      }
    }
  }, []);

  // Fetch companies
  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*");
      if (error) throw error;
      return data as Company[];
    },
  });

  // Fetch reports
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sustainability_reports").select("*");
      if (error) throw error;
      return data as Report[];
    },
  });

  // Enrich reports with company data
  const enrichedReports = useMemo(() => {
    return reports.map((report) => ({
      ...report,
      company: companies.find((c) => c.id === report.company_id),
    }));
  }, [reports, companies]);

  // Extract unique values for filters
  const industries = useMemo(() => Array.from(new Set(companies.map((c) => c.industry).filter(Boolean))), [companies]);
  const years = useMemo(() => Array.from(new Set(reports.map((r) => r.report_year))).sort((a, b) => b - a), [reports]);

  // Filter and sort data
  const filteredReports = useMemo(() => {
    let filtered = enrichedReports;

    if (nameSearch) {
      filtered = filtered.filter((r) =>
        r.company?.name?.toLowerCase().includes(nameSearch.toLowerCase())
      );
    }
    if (industryFilter !== "all") {
      filtered = filtered.filter((r) => r.company?.industry === industryFilter);
    }
    if (yearFilter !== "all") {
      filtered = filtered.filter((r) => r.report_year === parseInt(yearFilter));
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      if (sortField === "name") {
        aVal = a.company?.name || "";
        bVal = b.company?.name || "";
      } else if (sortField === "industry") {
        aVal = a.company?.industry || "";
        bVal = b.company?.industry || "";
      } else if (sortField === "ghg_emissions") {
        aVal = a.ghg_emissions || 0;
        bVal = b.ghg_emissions || 0;
      } else if (sortField === "report_year") {
        aVal = a.report_year;
        bVal = b.report_year;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [enrichedReports, nameSearch, industryFilter, yearFilter, sortField, sortDirection]);

  // Paginate
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
    const pageIds = paginatedReports.map((r) => r.company_id).filter(Boolean) as string[];
    setSelectedCompanyIds((prev) => Array.from(new Set([...prev, ...pageIds])));
  };

  const handleUnselectPage = () => {
    const pageIds = new Set(paginatedReports.map((r) => r.company_id));
    setSelectedCompanyIds((prev) => prev.filter((id) => !pageIds.has(id)));
  };

  const handleClear = () => {
    setSelectedCompanyIds([]);
  };

  const handleAddBaseline = () => {
    const newBaseline = Array.from(new Set([...baseline, ...selectedCompanyIds]));
    setBaseline(newBaseline);
    localStorage.setItem("sector-ranking-baseline", JSON.stringify(newBaseline));
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

    const selectedReports = enrichedReports.filter((r) => selectedCompanyIds.includes(r.company_id));
    if (selectedReports.length === 0) return;

    const emissions = selectedReports.map((r) => r.ghg_emissions || 0);
    const best = Math.min(...emissions);
    const worst = Math.max(...emissions);

    const bestCompany = selectedReports.find((r) => r.ghg_emissions === best);
    const worstCompany = selectedReports.find((r) => r.ghg_emissions === worst);

    toast({
      title: "Comparison Result",
      description: `Best: ${bestCompany?.company?.name} (${best} tCO₂e)\nWorst: ${worstCompany?.company?.name} (${worst} tCO₂e)`,
    });
  };

  const handleToggleSelect = (companyId: string) => {
    setSelectedCompanyIds((prev) =>
      prev.includes(companyId) ? prev.filter((id) => id !== companyId) : [...prev, companyId]
    );
  };

  // Build external context for chat
  const externalContext = useMemo(() => {
    const selected = enrichedReports.filter((r) => selectedCompanyIds.includes(r.company_id));
    return {
      filters: {
        nameSearch,
        industry: industryFilter,
        region: regionFilter,
        scale: scaleFilter,
        country: countryFilter,
        year: yearFilter,
      },
      selectedCompanies: selected.map((r) => ({
        name: r.company?.name,
        industry: r.company?.industry,
        year: r.report_year,
        emissions: r.ghg_emissions,
      })),
      baseline: baseline,
    };
  }, [enrichedReports, selectedCompanyIds, nameSearch, industryFilter, regionFilter, scaleFilter, countryFilter, yearFilter, baseline]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Sector Ranking</h1>
          <p className="text-muted-foreground">
            Compare companies by emissions, select baselines, and analyze with AI.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Filters */}
            <div className="bg-card border border-border rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Input
                  placeholder="Search by name..."
                  value={nameSearch}
                  onChange={(e) => setNameSearch(e.target.value)}
                />
                <Select value={industryFilter} onValueChange={setIndustryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Industries</SelectItem>
                    {industries.map((ind) => (
                      <SelectItem key={ind} value={ind}>
                        {ind}
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

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSelectPage} variant="outline" size="sm">
                Select Page
              </Button>
              <Button onClick={handleUnselectPage} variant="outline" size="sm">
                Unselect Page
              </Button>
              <Button onClick={handleClear} variant="outline" size="sm">
                Clear Selection
              </Button>
              <Button onClick={handleAddBaseline} variant="secondary" size="sm">
                Add Baseline
              </Button>
              <Button onClick={handleCompareSelected} variant="default" size="sm">
                <TrendingUp className="h-4 w-4 mr-2" />
                Compare Selected
              </Button>
            </div>

            {/* Table */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Select</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort("name")}
                        className="flex items-center gap-1"
                      >
                        Company
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort("industry")}
                        className="flex items-center gap-1"
                      >
                        Industry
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort("report_year")}
                        className="flex items-center gap-1"
                      >
                        Year
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort("ghg_emissions")}
                        className="flex items-center gap-1"
                      >
                        Emissions (tCO₂e)
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      </TableRow>
                    ))
                  ) : paginatedReports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
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
                        <TableCell className="font-medium">{report.company?.name || "—"}</TableCell>
                        <TableCell>{report.company?.industry || "—"}</TableCell>
                        <TableCell>{report.report_year}</TableCell>
                        <TableCell>{report.ghg_emissions?.toLocaleString() || "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
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
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Chat Sidebar */}
          <div className="lg:col-span-1">
            <SectorRankingChat externalContext={externalContext} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default SectorRanking;
