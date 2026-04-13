import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Navigation from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Upload } from "lucide-react";
import { createReport, listCompanies, listReports, uploadReportPdf, type ApiReport } from "@/lib/api";

interface Company { id: number; name: string; }
interface ReportView { id: number; report_year: number; ghg_emissions: number | null; company_id: number | null; company_name: string; }

const Reports = () => {
  const [searchParams] = useSearchParams();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [reports, setReports] = useState<ReportView[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({ company_id: searchParams.get("company") || "", report_year: new Date().getFullYear(), ghg_emissions: "" });
  const { toast } = useToast();

  const companyMap = useMemo(() => new Map(companies.map((c) => [c.id, c.name])), [companies]);

  useEffect(() => { void fetchData(); }, []);

  const toReportView = (report: ApiReport): ReportView => ({
    id: report.id,
    report_year: report.year,
    ghg_emissions: Number(report.extracted_json?.ghg_emissions) || null,
    company_id: report.company_id,
    company_name: report.company_id ? companyMap.get(report.company_id) || `Company #${report.company_id}` : "Unknown Company",
  });

  const fetchData = async () => {
    try {
      const [companiesData, reportsData] = await Promise.all([listCompanies(), listReports()]);
      const normalizedCompanies = companiesData.map((c) => ({ id: c.id, name: c.name }));
      const map = new Map(normalizedCompanies.map((c) => [c.id, c.name]));
      setCompanies(normalizedCompanies);
      setReports(reportsData.map((r) => ({
        id: r.id,
        report_year: r.year,
        ghg_emissions: Number(r.extracted_json?.ghg_emissions) || null,
        company_id: r.company_id,
        company_name: r.company_id ? map.get(r.company_id) || `Company #${r.company_id}` : "Unknown Company",
      })));
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to load data", variant: "destructive" });
    }
  };

  const filteredReports = useMemo(() => {
    const companyIdFilter = searchParams.get("company");
    return reports.filter((r) => !companyIdFilter || r.company_id?.toString() === companyIdFilter);
  }, [reports, searchParams]);

  const handleAddReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company_id) return;

    try {
      const report = await createReport({
        company_id: parseInt(formData.company_id, 10),
        year: formData.report_year,
        extracted_json: {
          ghg_emissions: formData.ghg_emissions ? parseFloat(formData.ghg_emissions) : null,
          file_name: selectedFile?.name ?? null,
        },
      });

      if (selectedFile) {
        await uploadReportPdf(report.id, selectedFile);
      }

      toast({ title: "Success", description: "Report added successfully" });
      setFormData({ company_id: "", report_year: new Date().getFullYear(), ghg_emissions: "" });
      setSelectedFile(null);
      setIsDialogOpen(false);
      await fetchData();
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to add report", variant: "destructive" });
    }
  };

  return <div className="min-h-screen bg-background"><Navigation /><main className="container mx-auto px-4 py-8"><div className="mb-8 flex items-center justify-between"><div><h1 className="text-4xl font-bold text-foreground mb-2">Sustainability Reports</h1><p className="text-muted-foreground">Upload and manage sustainability reports</p></div><Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}><DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />Add Report</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Add New Report</DialogTitle></DialogHeader><form onSubmit={handleAddReport} className="space-y-4"><div><Label htmlFor="company">Company *</Label><Select value={formData.company_id} onValueChange={(value) => setFormData({ ...formData, company_id: value })} required><SelectTrigger><SelectValue placeholder="Select a company" /></SelectTrigger><SelectContent>{companies.map((company) => <SelectItem key={company.id} value={company.id.toString()}>{company.name}</SelectItem>)}</SelectContent></Select></div><div><Label htmlFor="year">Report Year *</Label><Input id="year" type="number" value={formData.report_year} onChange={(e) => setFormData({ ...formData, report_year: parseInt(e.target.value, 10) })} required /></div><div><Label htmlFor="emissions">GHG Emissions (tCO₂e)</Label><Input id="emissions" type="number" step="0.01" value={formData.ghg_emissions} onChange={(e) => setFormData({ ...formData, ghg_emissions: e.target.value })} /></div><div><Label htmlFor="file">Upload PDF (optional)</Label><Input id="file" type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} accept="application/pdf,.pdf" />{selectedFile && <p className="text-sm text-muted-foreground mt-2">Selected: {selectedFile.name}</p>}</div><Button type="submit" className="w-full gap-2"><Upload className="h-4 w-4" />Add Report</Button></form></DialogContent></Dialog></div><div className="grid gap-4">{filteredReports.map((report) => <Card key={report.id}><CardHeader><CardTitle>{report.company_name} - {report.report_year}</CardTitle><CardDescription>{report.ghg_emissions ? `${report.ghg_emissions.toLocaleString()} tCO₂e` : "No emissions data"}</CardDescription></CardHeader></Card>)}</div></main></div>;
};

export default Reports;