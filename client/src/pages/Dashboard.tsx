import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import Navigation from "@/components/layout/Navigation";
import ReportsChat from "@/components/dashboard/ReportsChat";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, FileText, TrendingDown, ArrowLeft } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { listCompanies, listReports } from "@/lib/api";

interface DashboardStats { totalReports: number; avgEmissions: number; latestYear: number; }
interface YearlyEmissions { year: number; emissions: number; }
interface Company { id: number; name: string; industry: string | null; }

const INDUSTRY_STANDARDS: Record<string, number> = { "Oil & Gas": 15000, Manufacturing: 8000, Technology: 3000, Retail: 2000, Finance: 1500, default: 5000 };

const Dashboard = () => {
  const { companyId } = useParams();
  const numericCompanyId = useMemo(() => Number(companyId), [companyId]);
  const { toast } = useToast();
  const [company, setCompany] = useState<Company | null>(null);
  const [stats, setStats] = useState<DashboardStats>({ totalReports: 0, avgEmissions: 0, latestYear: 0 });
  const [emissionsData, setEmissionsData] = useState<YearlyEmissions[]>([]);
  const [comparisonResult, setComparisonResult] = useState<string | null>(null);

  useEffect(() => { if (numericCompanyId) void fetchDashboardData(); }, [numericCompanyId]);

  const fetchDashboardData = async () => {
    try {
      const [companies, reports] = await Promise.all([listCompanies(), listReports()]);
      const selectedCompany = companies.find((c) => c.id === numericCompanyId);
      setCompany(selectedCompany ? { id: selectedCompany.id, name: selectedCompany.name, industry: selectedCompany.sector } : null);

      const targetReports = reports.filter((r) => r.company_id === numericCompanyId);
      if (targetReports.length === 0) {
        setStats({ totalReports: 0, avgEmissions: 0, latestYear: 0 });
        setEmissionsData([]);
        return;
      }

      const parsed = targetReports.map((r) => ({ year: r.year, emissions: Number(r.extracted_json?.ghg_emissions) || 0 }));
      const avgEmissions = parsed.reduce((acc, r) => acc + r.emissions, 0) / parsed.length;
      const latestYear = Math.max(...parsed.map((r) => r.year));

      setStats({ totalReports: parsed.length, avgEmissions, latestYear });
      setEmissionsData(parsed.sort((a, b) => a.year - b.year));
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to load dashboard", variant: "destructive" });
    }
  };

  const handleCompare = () => {
    if (!company || emissionsData.length === 0) return;
    const latestData = emissionsData[emissionsData.length - 1];
    const standard = INDUSTRY_STANDARDS[company.industry || ""] || INDUSTRY_STANDARDS.default;
    const difference = latestData.emissions - standard;
    const percentDiff = ((difference / standard) * 100).toFixed(1);
    const result = difference > 0
      ? `⚠️ ${company.name} is ${Math.abs(difference).toFixed(0)} tCO₂e (${percentDiff}%) ABOVE the industry standard of ${standard} tCO₂e for ${latestData.year}.`
      : `✅ ${company.name} is ${Math.abs(difference).toFixed(0)} tCO₂e (${Math.abs(Number(percentDiff))}%) BELOW the industry standard of ${standard} tCO₂e for ${latestData.year}.`;
    setComparisonResult(result);
  };

  if (!companyId) return <div className="min-h-screen bg-background"><Navigation /><main className="container mx-auto px-4 py-8"><p className="text-center text-muted-foreground">No company selected</p></main></div>;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Button variant="ghost" className="mb-4 gap-2" asChild><a href="/companies"><ArrowLeft className="h-4 w-4" />Back to Companies</a></Button>
            <h1 className="text-4xl font-bold text-foreground mb-2">{company?.name || "Loading..."} Dashboard</h1>
            <p className="text-muted-foreground mb-8">{company?.industry ? `${company.industry} • ` : ""}Sustainability metrics and industry comparison</p>
            <div className="grid gap-6 md:grid-cols-3 mb-8">
              <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Reports</CardTitle><FileText className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-3xl font-bold text-primary">{stats.totalReports}</div></CardContent></Card>
              <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Avg. Emissions</CardTitle><TrendingDown className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-3xl font-bold text-primary">{stats.avgEmissions.toFixed(0)} <span className="text-sm font-normal text-muted-foreground">tCO₂e</span></div></CardContent></Card>
              <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Latest Year</CardTitle><BarChart3 className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-3xl font-bold text-primary">{stats.latestYear || "—"}</div></CardContent></Card>
            </div>
            <Card className="mb-8"><CardHeader><CardTitle>GHG Emissions Over Time</CardTitle><CardDescription>Yearly emissions trend for {company?.name}</CardDescription></CardHeader><CardContent>{emissionsData.length > 0 ? <ResponsiveContainer width="100%" height={400}><BarChart data={emissionsData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="year" /><YAxis /><Tooltip /><Legend /><Bar dataKey="emissions" fill="hsl(var(--primary))" name="Emissions (tCO₂e)" /></BarChart></ResponsiveContainer> : <div className="flex h-[400px] items-center justify-center text-muted-foreground">No emissions data available yet. Add reports to see analytics.</div>}</CardContent></Card>
            {emissionsData.length > 0 && <Card><CardHeader><CardTitle>Industry Standard Comparison</CardTitle></CardHeader><CardContent className="space-y-4"><Button onClick={handleCompare}>Compare to Industry Standard</Button>{comparisonResult && <div className="mt-4 p-4 rounded-lg bg-muted"><p className="text-sm font-medium">{comparisonResult}</p></div>}</CardContent></Card>}
          </div>
          <div className="lg:col-span-1"><div className="sticky top-8 h-[calc(100vh-6rem)]"><ReportsChat companyId={companyId} /></div></div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;