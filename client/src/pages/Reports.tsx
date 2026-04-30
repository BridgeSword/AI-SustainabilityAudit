import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Navigation from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
import { useToast } from "@/hooks/use-toast";
import {
  ChevronDown,
  ChevronRight,
  FileDown,
  FileText,
  FolderOpen,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import {
  createReport,
  deleteReport,
  listCompanies,
  listReports,
  replacePdf,
  updateReport,
  uploadReportPdf,
  getPdfDownloadUrl,
  type ApiCompany,
  type ApiReport,
} from "@/lib/api";
import { mockCompanies, mockReports } from "@/data/mockReports";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Company {
  id: number;
  name: string;
}

interface ReportView {
  id: number;
  report_year: number;
  file_name: string | null;
  ghg_emissions: number | null;
  esg_score?: number | null;
  water_usage?: number | null;
  energy_usage?: number | null;
  renewable_energy_percentage?: number | null;
  waste_generated?: number | null;
  company_id: number | null;
  company_name: string;
  extraction_status: string | null;
  is_mock?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const Reports = () => {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  /* ---- data ---- */
  const [companies, setCompanies] = useState<Company[]>([]);
  const [reports, setReports] = useState<ReportView[]>([]);

  /* ---- add report dialog ---- */
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    company_id: searchParams.get("company") || "",
    report_year: new Date().getFullYear(),
    ghg_emissions: "",
  });

  /* ---- edit dialog ---- */
  const [editOpen, setEditOpen] = useState(false);
  const [editReport, setEditReport] = useState<ReportView | null>(null);
  const [editYear, setEditYear] = useState("");
  const [editGhg, setEditGhg] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  /* ---- delete confirm dialog ---- */
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ReportView | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  /* ---- folder expand/collapse ---- */
  const [expandedCompanies, setExpandedCompanies] = useState<Set<number>>(
    new Set()
  );

  /* ---- load data ---- */
  useEffect(() => {
    void fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [companiesData, reportsData] = await Promise.all([
        listCompanies(),
        listReports(),
      ]);

      const normalized = (companiesData.length > 0 ? companiesData : mockCompanies).map((c) => ({
        id: c.id,
        name: c.name,
      }));
      const map = new Map(normalized.map((c) => [c.id, c.name]));

      setCompanies(normalized);
      const normalizedReports =
        reportsData.length > 0
          ? reportsData.map((r) => ({
          id: r.id,
          report_year: r.year,
          file_name:
            (r.extracted_json?.file_name as string) || null,
          ghg_emissions: Number(r.extracted_json?.ghg_emissions) || null,
          esg_score: Number(r.extracted_json?.esg_score) || null,
          water_usage: Number(r.extracted_json?.water_withdrawal_m3) || null,
          energy_usage: Number(r.extracted_json?.energy_consumption_mwh) || null,
          renewable_energy_percentage:
            Number(r.extracted_json?.renewable_energy_percentage) || null,
          waste_generated: Number(r.extracted_json?.waste_generated_tonnes) || null,
          company_id: r.company_id,
          company_name: r.company_id
            ? map.get(r.company_id) || `Company #${r.company_id}`
            : "Unknown Company",
          extraction_status: r.extraction_status,
        }))
          : mockReports.map((r) => ({
              id: r.id,
              report_year: r.year,
              file_name: r.fileName,
              ghg_emissions: r.carbonEmissions,
              esg_score: r.esgScore,
              water_usage: r.waterUsage,
              energy_usage: r.energyUsage,
              renewable_energy_percentage: r.renewableEnergyPercentage,
              waste_generated: r.wasteGenerated,
              company_id: r.companyId,
              company_name: r.companyName,
              extraction_status: "completed",
              is_mock: true,
            }));

      setReports(normalizedReports);

      // Auto-expand all companies that have reports
      const companiesWithReports = new Set(
        normalizedReports
          .map((r) => r.company_id)
          .filter((id): id is number => id != null)
      );
      setExpandedCompanies(companiesWithReports);
    } catch (error) {
      const normalized = mockCompanies.map((c) => ({ id: c.id, name: c.name }));
      const normalizedReports = mockReports.map((r) => ({
        id: r.id,
        report_year: r.year,
        file_name: r.fileName,
        ghg_emissions: r.carbonEmissions,
        esg_score: r.esgScore,
        water_usage: r.waterUsage,
        energy_usage: r.energyUsage,
        renewable_energy_percentage: r.renewableEnergyPercentage,
        waste_generated: r.wasteGenerated,
        company_id: r.companyId,
        company_name: r.companyName,
        extraction_status: "completed",
        is_mock: true,
      }));
      setCompanies(normalized);
      setReports(normalizedReports);
      setExpandedCompanies(new Set(normalizedReports.map((report) => report.company_id || 0)));
      toast({
        title: "Demo data loaded",
        description:
          error instanceof Error ? `Backend unavailable: ${error.message}` : "Backend unavailable",
      });
    }
  };

  /* ---- grouped by company ---- */
  const groupedReports = useMemo(() => {
    const companyIdFilter = searchParams.get("company");
    const filtered = reports.filter(
      (r) => !companyIdFilter || r.company_id?.toString() === companyIdFilter
    );

    const groups = new Map<
      number,
      { company: Company; reports: ReportView[] }
    >();

    for (const r of filtered) {
      const cid = r.company_id ?? 0;
      if (!groups.has(cid)) {
        const comp = companies.find((c) => c.id === cid) || {
          id: cid,
          name: r.company_name,
        };
        groups.set(cid, { company: comp, reports: [] });
      }
      groups.get(cid)!.reports.push(r);
    }

    // Sort reports within each group by year descending
    for (const g of groups.values()) {
      g.reports.sort((a, b) => b.report_year - a.report_year);
    }

    return Array.from(groups.values()).sort((a, b) =>
      a.company.name.localeCompare(b.company.name)
    );
  }, [reports, companies, searchParams]);

  /* ---- toggle folder ---- */
  const toggleCompany = (id: number) => {
    setExpandedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ---- add report ---- */
  const handleAddReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company_id) return;

    try {
      const report = await createReport({
        company_id: parseInt(formData.company_id, 10),
        year: formData.report_year,
        extracted_json: {
          ghg_emissions: formData.ghg_emissions
            ? parseFloat(formData.ghg_emissions)
            : null,
          file_name: selectedFile?.name ?? null,
        },
      });

      if (selectedFile) {
        await uploadReportPdf(report.id, selectedFile);
      }

      toast({ title: "Success", description: "Report added" });
      setFormData({
        company_id: "",
        report_year: new Date().getFullYear(),
        ghg_emissions: "",
      });
      setSelectedFile(null);
      setIsDialogOpen(false);
      await fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to add report",
        variant: "destructive",
      });
    }
  };

  /* ---- edit report ---- */
  const openEdit = (r: ReportView) => {
    setEditReport(r);
    setEditYear(String(r.report_year));
    setEditGhg(r.ghg_emissions != null ? String(r.ghg_emissions) : "");
    setEditFile(null);
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editReport) return;
    setIsEditing(true);
    try {
      // 1. Update metadata if changed
      const yearNum = parseInt(editYear, 10);
      const ghgNum = editGhg ? parseFloat(editGhg) : null;

      await updateReport(editReport.id, {
        year: yearNum,
        extracted_json: {
          ghg_emissions: ghgNum,
          file_name: editFile?.name ?? editReport.file_name ?? null,
        },
      });

      // 2. Replace PDF if a new file was selected
      if (editFile) {
        await replacePdf(editReport.id, editFile);
      }

      toast({ title: "Success", description: "Report updated" });
      setEditOpen(false);
      await fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update report",
        variant: "destructive",
      });
    } finally {
      setIsEditing(false);
    }
  };

  /* ---- delete report ---- */
  const openDelete = (r: ReportView) => {
    setDeleteTarget(r);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteReport(deleteTarget.id);
      toast({ title: "Deleted", description: "Report has been removed" });
      setDeleteOpen(false);
      setDeleteTarget(null);
      await fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete report",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-4xl font-bold text-foreground">
              Sustainability Reports
            </h1>
            <p className="text-muted-foreground">
              Upload and manage sustainability reports
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Report
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Report</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleAddReport} className="space-y-4">
                <div>
                  <Label htmlFor="company">Company *</Label>
                  <Select
                    value={formData.company_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, company_id: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a company" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((company) => (
                        <SelectItem
                          key={company.id}
                          value={company.id.toString()}
                        >
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="year">Report Year *</Label>
                  <Input
                    id="year"
                    type="number"
                    value={formData.report_year}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        report_year: parseInt(e.target.value, 10),
                      })
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="emissions">
                    GHG Emissions (tCO&#x2082;e)
                  </Label>
                  <Input
                    id="emissions"
                    type="number"
                    step="0.01"
                    value={formData.ghg_emissions}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ghg_emissions: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="file">Upload PDF (optional)</Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={(e) =>
                      setSelectedFile(e.target.files?.[0] || null)
                    }
                    accept="application/pdf,.pdf"
                  />
                  {selectedFile && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Selected: {selectedFile.name}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full gap-2">
                  <Upload className="h-4 w-4" />
                  Add Report
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Company folder list */}
        <div className="space-y-4">
          {groupedReports.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">
              No reports yet. Click "Add Report" to get started.
            </Card>
          )}

          {groupedReports.map(({ company, reports: companyReports }) => {
            const isExpanded = expandedCompanies.has(company.id);

            return (
              <Card key={company.id} className="overflow-hidden">
                {/* Folder header */}
                <button
                  className="flex w-full items-center gap-3 px-6 py-4 text-left transition-colors hover:bg-accent"
                  onClick={() => toggleCompany(company.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                  <FolderOpen className="h-5 w-5 text-primary" />
                  <span className="flex-1 text-lg font-semibold">
                    {company.name}
                  </span>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {companyReports.length} report
                    {companyReports.length !== 1 ? "s" : ""}
                  </span>
                </button>

                {/* Expanded: reports table */}
                {isExpanded && (
                  <div className="border-t">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-24">Year</TableHead>
                          <TableHead>Report Name</TableHead>
                          <TableHead className="w-40">
                            GHG Emissions
                          </TableHead>
                          <TableHead className="w-24">ESG</TableHead>
                          <TableHead className="w-28">Renewable</TableHead>
                          <TableHead className="w-32">Status</TableHead>
                          <TableHead className="w-32 text-right">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {companyReports.map((report) => (
                          <TableRow key={report.id}>
                            <TableCell className="font-medium">
                              {report.report_year}
                            </TableCell>
                            <TableCell>
                              {report.is_mock ? (
                                <span className="inline-flex items-center gap-1.5">
                                  <FileDown className="h-4 w-4 text-muted-foreground" />
                                  {report.file_name || "Demo Report"}
                                </span>
                              ) : (
                                <a
                                  href={getPdfDownloadUrl(report.id)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline"
                                >
                                  <FileDown className="h-4 w-4" />
                                  {report.file_name || "Unnamed Report"}
                                </a>
                              )}
                            </TableCell>
                            <TableCell>
                              {report.ghg_emissions != null
                                ? `${report.ghg_emissions.toLocaleString()} tCO\u2082e`
                                : "—"}
                            </TableCell>
                            <TableCell>
                              {report.esg_score != null ? report.esg_score : "-"}
                            </TableCell>
                            <TableCell>
                              {report.renewable_energy_percentage != null
                                ? `${report.renewable_energy_percentage}%`
                                : "-"}
                            </TableCell>
                            <TableCell>
                              {report.extraction_status === "completed" ? (
                                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                                  completed
                                </span>
                              ) : report.extraction_status ===
                                "processing" ? (
                                <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                                  processing
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
                              <div className="inline-flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  title="Edit report"
                                  onClick={() => openEdit(report)}
                                  disabled={report.is_mock}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                  title="Delete report"
                                  onClick={() => openDelete(report)}
                                  disabled={report.is_mock}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </main>

      {/* ---- Edit Dialog ---- */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit Report — {editReport?.company_name}{" "}
              {editReport?.report_year}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Report Year</Label>
              <Input
                type="number"
                value={editYear}
                onChange={(e) => setEditYear(e.target.value)}
              />
            </div>

            <div>
              <Label>GHG Emissions (tCO&#x2082;e)</Label>
              <Input
                type="number"
                step="0.01"
                value={editGhg}
                onChange={(e) => setEditGhg(e.target.value)}
              />
            </div>

            <div>
              <Label>Replace PDF (optional)</Label>
              <Input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) =>
                  setEditFile(e.target.files?.[0] || null)
                }
              />
              {editFile && (
                <p className="mt-2 text-sm text-muted-foreground">
                  New file: {editFile.name}
                </p>
              )}
            </div>

            <Button
              className="w-full gap-2"
              onClick={handleEdit}
              disabled={isEditing}
            >
              {isEditing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---- Delete Confirm Dialog ---- */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>

          <p className="py-4 text-sm text-muted-foreground">
            Are you sure you want to delete the{" "}
            <span className="font-medium text-foreground">
              {deleteTarget?.report_year}
            </span>{" "}
            report for{" "}
            <span className="font-medium text-foreground">
              {deleteTarget?.company_name}
            </span>
            ? This will also permanently remove the stored PDF file. This
            action cannot be undone.
          </p>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Reports;
