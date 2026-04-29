import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  FolderOpen,
  Search,
  ArrowUpDown,
  FileDown,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/layout/Navigation";
import SectorRankingChat from "@/components/sector-ranking/SectorRankingChat";
import {
  createCompany,
  createReport,
  listCompanies,
  listReports,
  uploadReportPdf,
  getPdfDownloadUrl,
  fixStuckReport,
} from "@/lib/api";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:9092").replace(/\/$/, "");

interface Company {
  id: number;
  name: string;
  industry: string | null;
}

interface Report {
  id: number;
  report_year: number;
  file_name: string | null;
  company_id: number;
  report_data?: any;
  extraction_status?: string | null;
  scoring_status?: string | null;
  anomaly_status?: string | null;
}

const InnovativeActionDetect = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const numericCompanyId = companyId ? Number(companyId) : null;
  const navigate = useNavigate();
  const { toast } = useToast();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [companySearch, setCompanySearch] = useState("");
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyIndustry, setNewCompanyIndustry] = useState("");

  const [reports, setReports] = useState<Report[]>([]);
  const [reportSearch, setReportSearch] = useState("");
  const [sortAscending, setSortAscending] = useState(false);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [addReportOpen, setAddReportOpen] = useState(false);
  const [newReportYear, setNewReportYear] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [analysisOpen, setAnalysisOpen] = useState(false);

  const [isUploadingReport, setIsUploadingReport] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [currentJobStatus, setCurrentJobStatus] = useState<string | null>(null);

  const [fixingReportId, setFixingReportId] = useState<number | null>(null);

  const [externalContext, setExternalContext] = useState<any>({});

  useEffect(() => {
    void fetchCompanies();
  }, []);

  useEffect(() => {
    if (numericCompanyId) {
      void fetchReports(numericCompanyId);
      setSelectedCompany(companies.find((c) => c.id === numericCompanyId) || null);
    }
  }, [numericCompanyId, companies, sortAscending]);

  useEffect(() => {
    setExternalContext({
      view: numericCompanyId ? "reports" : "companies",
      selectedCompany,
      selectedReport,
      reports: numericCompanyId ? reports : undefined,
    });
  }, [numericCompanyId, selectedCompany, selectedReport, reports]);

  const fetchCompanies = async () => {
    setIsLoadingCompanies(true);
    try {
      const data = await listCompanies();
      setCompanies(
        data.map((c) => ({
          id: c.id,
          name: c.name,
          industry: c.sector,
        }))
      );
    } catch {
      toast({
        title: "Error",
        description: "Failed to load companies",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCompanies(false);
    }
  };

  const fetchReports = async (id: number) => {
    setIsLoadingReports(true);
    try {
      const data = await listReports();
      const filtered = data
        .filter((r) => r.company_id === id)
        .map((r) => ({
          id: r.id,
          report_year: r.year,
          file_name: (r.extracted_json?.file_name as string) || `Report ${r.year}`,
          company_id: r.company_id || id,
          report_data: r.extracted_json,
          extraction_status: r.extraction_status,
          scoring_status: r.scoring_status,
          anomaly_status: r.anomaly_status,
        }))
        .sort((a, b) =>
          sortAscending ? a.report_year - b.report_year : b.report_year - a.report_year
        );

      setReports(filtered);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load reports",
        variant: "destructive",
      });
    } finally {
      setIsLoadingReports(false);
    }
  };

  const handleAddCompany = async () => {
    if (!newCompanyName.trim()) {
      return toast({
        title: "Validation Error",
        description: "Company name is required",
        variant: "destructive",
      });
    }

    try {
      await createCompany({
        name: newCompanyName,
        sector: newCompanyIndustry || null,
      });

      toast({
        title: "Success",
        description: "Company added successfully",
      });

      setAddCompanyOpen(false);
      setNewCompanyName("");
      setNewCompanyIndustry("");
      await fetchCompanies();
    } catch {
      toast({
        title: "Error",
        description: "Failed to add company",
        variant: "destructive",
      });
    }
  };

  const pollUploadJob = async (jobId: string, reportId: number) => {
    const maxAttempts = 60;

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const res = await fetch(`${API_BASE_URL}/pdf/v1/jobs/${jobId}/status?report_id=${reportId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.detail || "Failed to check PDF extraction status");
      }

      const status = data.status || data.raw_status?.state || "processing";
      setCurrentJobStatus(status);

      if (status === "completed" || status === "done" || status === "success" || status === "finished") {
        return;
      }

      if (status === "failed" || status === "error") {
        throw new Error("PDF extraction failed.");
      }
    }

    throw new Error("PDF extraction timed out.");
  };

  const handleAddReport = async () => {
    if (!newReportYear || !numericCompanyId) {
      return toast({
        title: "Validation Error",
        description: "Year is required",
        variant: "destructive",
      });
    }

    try {
      setIsUploadingReport(true);
      setCurrentJobId(null);
      setCurrentJobStatus("creating");

      const report = await createReport({
        company_id: numericCompanyId,
        year: parseInt(newReportYear, 10),
        extracted_json: {
          file_name: selectedFile?.name || `Report ${newReportYear}`,
        },
      });

      if (selectedFile) {
        const uploadResp = await uploadReportPdf(report.id, selectedFile);
        const jobId = uploadResp.job_id;

        setCurrentJobId(jobId);
        setCurrentJobStatus("processing");

        toast({
          title: "Processing started",
          description: "PDF uploaded. Waiting for extraction result...",
        });

        await pollUploadJob(jobId, report.id);
      }

      toast({
        title: "Success",
        description: "Report added and processed successfully",
      });

      setAddReportOpen(false);
      setNewReportYear("");
      setSelectedFile(null);
      setCurrentJobId(null);
      setCurrentJobStatus(null);

      await fetchReports(numericCompanyId);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add report",
        variant: "destructive",
      });
    } finally {
      setIsUploadingReport(false);
    }
  };

  const handleAnalyze = (report: Report) => {
    setSelectedReport(report);

    if (!report.report_data || report.extraction_status !== "completed") {
      toast({
        title: "Not ready yet",
        description: "This report has not finished PDF extraction yet.",
        variant: "destructive",
      });
      return;
    }

    setAnalysisOpen(true);
  };

  const handleFixStuck = async (report: Report) => {
    if (!numericCompanyId) return;
    setFixingReportId(report.id);
    try {
      await fixStuckReport(report.id);
      toast({
        title: "Success",
        description: "Report extraction completed",
      });
      await fetchReports(numericCompanyId);
    } catch {
      toast({
        title: "Error",
        description: "Failed to fix stuck report",
        variant: "destructive",
      });
    } finally {
      setFixingReportId(null);
    }
  };

  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(companySearch.toLowerCase())
  );

  const filteredReports = reports.filter((report) =>
    (report.file_name || "").toLowerCase().includes(reportSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-6">
          <div className="flex-1">
            {!numericCompanyId ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h1 className="text-3xl font-bold text-foreground">
                    Innovative Action Detect
                  </h1>

                  <Dialog open={addCompanyOpen} onOpenChange={setAddCompanyOpen}>
                    <DialogTrigger asChild>
                      <Button className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add Company
                      </Button>
                    </DialogTrigger>

                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Company</DialogTitle>
                      </DialogHeader>

                      <div className="space-y-4 py-4">
                        <Input
                          value={newCompanyName}
                          onChange={(e) => setNewCompanyName(e.target.value)}
                          placeholder="Company name"
                        />
                        <Input
                          value={newCompanyIndustry}
                          onChange={(e) => setNewCompanyIndustry(e.target.value)}
                          placeholder="Industry"
                        />
                        <Button onClick={handleAddCompany} className="w-full">
                          Add Company
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search company"
                    value={companySearch}
                    onChange={(e) => setCompanySearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <ScrollArea className="h-[calc(100vh-16rem)]">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {isLoadingCompanies
                      ? Array.from({ length: 6 }).map((_, i) => (
                          <Skeleton key={i} className="h-32" />
                        ))
                      : filteredCompanies.map((company) => (
                          <Card
                            key={company.id}
                            className="cursor-pointer p-6 transition-colors hover:bg-accent"
                            onClick={() =>
                              navigate(`/innovative-action-detect/${company.id}`)
                            }
                          >
                            <div className="flex items-center gap-4">
                              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                                <FolderOpen className="h-6 w-6 text-primary" />
                              </div>
                              <div className="flex-1">
                                <h3 className="font-semibold text-foreground">
                                  {company.name}
                                </h3>
                                {company.industry && (
                                  <p className="text-sm text-muted-foreground">
                                    {company.industry}
                                  </p>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Button
                      variant="ghost"
                      onClick={() => navigate("/innovative-action-detect")}
                      className="mb-2"
                    >
                      ← Back to Companies
                    </Button>
                    <h1 className="text-3xl font-bold text-foreground">
                      {selectedCompany?.name || "Company"} Reports
                    </h1>
                  </div>

                  <Button
                    className="flex items-center gap-2"
                    onClick={() => setAddReportOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Add Report
                  </Button>
                </div>

                {currentJobId && (
                  <Card className="p-4">
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="font-medium">Job ID:</span> {currentJobId}
                      </p>
                      <p>
                        <span className="font-medium">Status:</span>{" "}
                        {currentJobStatus || "processing"}
                      </p>
                    </div>
                  </Card>
                )}

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search report"
                      value={reportSearch}
                      onChange={(e) => setReportSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => setSortAscending(!sortAscending)}
                  >
                    <ArrowUpDown className="mr-2 h-4 w-4" />
                    Sort by Year ({sortAscending ? "Asc" : "Desc"})
                  </Button>
                </div>

                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Year</TableHead>
                        <TableHead>Report Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {isLoadingReports
                        ? Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                              <TableCell>
                                <Skeleton className="h-4 w-16" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-4 w-48" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-4 w-24" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="ml-auto h-8 w-24" />
                              </TableCell>
                            </TableRow>
                          ))
                        : filteredReports.map((report) => (
                            <TableRow key={report.id}>
                              <TableCell className="font-medium">
                                {report.report_year}
                              </TableCell>
                              <TableCell>
                                <a
                                  href={getPdfDownloadUrl(report.id)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                                >
                                  <FileDown className="h-4 w-4" />
                                  {report.file_name || "Unnamed Report"}
                                </a>
                              </TableCell>
                              <TableCell>
                                {report.extraction_status === "processing" ? (
                                  <span className="inline-flex items-center gap-2">
                                    <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                                      processing
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-xs"
                                      disabled={fixingReportId === report.id}
                                      onClick={() => handleFixStuck(report)}
                                    >
                                      <RefreshCw
                                        className={`mr-1 h-3 w-3 ${
                                          fixingReportId === report.id
                                            ? "animate-spin"
                                            : ""
                                        }`}
                                      />
                                      {fixingReportId === report.id
                                        ? "Fixing..."
                                        : "Fix"}
                                    </Button>
                                  </span>
                                ) : report.extraction_status === "completed" ? (
                                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                                    completed
                                  </span>
                                ) : report.extraction_status === "failed" ? (
                                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                                    failed
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                                    {report.extraction_status || "pending"}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  onClick={() => handleAnalyze(report)}
                                  disabled={
                                    report.extraction_status !== "completed"
                                  }
                                >
                                  Analyze
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                    </TableBody>
                  </Table>
                </Card>
              </div>
            )}
          </div>

          <div className="w-[400px]">
            <SectorRankingChat externalContext={externalContext} />
          </div>
        </div>
      </div>

      <Dialog open={addReportOpen} onOpenChange={setAddReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add New Report - {selectedCompany?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Input
              type="number"
              value={newReportYear}
              onChange={(e) => setNewReportYear(e.target.value)}
              placeholder="2024"
            />

            <Input
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              accept="application/pdf,.pdf"
            />

            {selectedFile && (
              <p className="mt-2 text-sm text-muted-foreground">
                Selected: {selectedFile.name}
              </p>
            )}

            <Button
              onClick={handleAddReport}
              className="w-full"
              disabled={isUploadingReport}
            >
              {isUploadingReport ? "Processing..." : "Add Report"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={analysisOpen} onOpenChange={setAnalysisOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Analysis Result - {selectedReport?.file_name || "Report"}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh]">
            {selectedReport?.report_data ? (
              <div className="space-y-6 p-4">
                {/* ESG Metrics */}
                <div>
                  <h3 className="mb-3 text-lg font-semibold">
                    ESG Metrics
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      {
                        label: "GHG Emissions",
                        key: "ghg_emissions",
                        unit: "tCO2e",
                      },
                      {
                        label: "Energy Consumption",
                        key: "energy_consumption_mwh",
                        unit: "MWh",
                      },
                      {
                        label: "Water Withdrawal",
                        key: "water_withdrawal_m3",
                        unit: "m\u00B3",
                      },
                      {
                        label: "Waste Generated",
                        key: "waste_generated_tonnes",
                        unit: "tonnes",
                      },
                    ].map(({ label, key, unit }) => {
                      const val =
                        selectedReport.report_data?.[key];
                      return (
                        <Card key={key} className="p-4">
                          <p className="text-sm text-muted-foreground">
                            {label}
                          </p>
                          <p className="mt-1 text-2xl font-bold">
                            {val != null
                              ? Number(val).toLocaleString()
                              : "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {unit}
                          </p>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* Scope Breakdown */}
                <div>
                  <h3 className="mb-3 text-lg font-semibold">
                    Scope Breakdown
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      { label: "Scope 1", key: "scope_1_emissions" },
                      { label: "Scope 2", key: "scope_2_emissions" },
                      { label: "Scope 3", key: "scope_3_emissions" },
                    ].map(({ label, key }) => {
                      const val =
                        selectedReport.report_data?.[key];
                      return (
                        <Card key={key} className="p-4">
                          <p className="text-sm text-muted-foreground">
                            {label}
                          </p>
                          <p className="mt-1 text-xl font-bold">
                            {val != null
                              ? Number(val).toLocaleString()
                              : "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            tCO2e
                          </p>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* Extracted Text */}
                {selectedReport.report_data?.full_text && (
                  <div>
                    <h3 className="mb-3 text-lg font-semibold">
                      Extracted Text
                    </h3>
                    <Card className="p-4">
                      <p className="whitespace-pre-wrap text-sm">
                        {String(
                          selectedReport.report_data.full_text
                        )}
                      </p>
                    </Card>
                  </div>
                )}

                {/* Metadata */}
                <div>
                  <h3 className="mb-3 text-lg font-semibold">
                    Metadata
                  </h3>
                  <Card className="p-4">
                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      <div>
                        <span className="text-muted-foreground">
                          File:{" "}
                        </span>
                        {selectedReport.report_data?.file_name ||
                          "—"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Method:{" "}
                        </span>
                        {selectedReport.report_data
                          ?.extraction_method || "—"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Extracted at:{" "}
                        </span>
                        {selectedReport.report_data?.extracted_at
                          ? new Date(
                              String(
                                selectedReport.report_data
                                  .extracted_at
                              )
                            ).toLocaleString()
                          : "—"}
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            ) : (
              <p className="p-4 text-muted-foreground">
                No extracted result available.
              </p>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InnovativeActionDetect;