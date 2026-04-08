import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Navigation from "@/components/layout/Navigation";
import ReportsChat from "@/components/dashboard/ReportsChat";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Building2, FileText, TrendingDown, ArrowLeft } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";

interface DashboardStats {
  totalReports: number;
  avgEmissions: number;
  latestYear: number;
}

interface YearlyEmissions {
  year: number;
  emissions: number;
}

interface Company {
  id: string;
  name: string;
  industry: string | null;
}

const INDUSTRY_STANDARDS: Record<string, number> = {
  "Oil & Gas": 15000,
  "Manufacturing": 8000,
  "Technology": 3000,
  "Retail": 2000,
  "Finance": 1500,
  "default": 5000,
};

const Dashboard = () => {
  const { companyId } = useParams();
  const { toast } = useToast();
  const [company, setCompany] = useState<Company | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalReports: 0,
    avgEmissions: 0,
    latestYear: 0,
  });
  const [emissionsData, setEmissionsData] = useState<YearlyEmissions[]>([]);
  const [comparisonResult, setComparisonResult] = useState<string | null>(null);

  useEffect(() => {
    if (companyId) {
      fetchDashboardData();
    }
  }, [companyId]);

  const fetchDashboardData = async () => {
    // Fetch company details
    const { data: companyData } = await supabase
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .single();

    setCompany(companyData);

    // Fetch reports for this company
    const { data: reports } = await supabase
      .from("sustainability_reports")
      .select("*")
      .eq("company_id", companyId)
      .order("report_year", { ascending: true });

    if (!reports || reports.length === 0) {
      setStats({ totalReports: 0, avgEmissions: 0, latestYear: 0 });
      setEmissionsData([]);
      return;
    }

    const avgEmissions = reports.reduce((acc, r) => acc + (Number(r.ghg_emissions) || 0), 0) / reports.length;
    const latestYear = Math.max(...reports.map(r => r.report_year));

    setStats({
      totalReports: reports.length,
      avgEmissions,
      latestYear,
    });

    const chartData = reports.map((report) => ({
      year: report.report_year,
      emissions: Number(report.ghg_emissions) || 0,
    }));

    setEmissionsData(chartData);
  };

  const handleCompare = () => {
    if (!company || emissionsData.length === 0) return;

    const latestData = emissionsData[emissionsData.length - 1];
    const standard = INDUSTRY_STANDARDS[company.industry || ""] || INDUSTRY_STANDARDS.default;
    const difference = latestData.emissions - standard;
    const percentDiff = ((difference / standard) * 100).toFixed(1);

    let result = "";
    if (difference > 0) {
      result = `⚠️ ${company.name} is ${Math.abs(difference).toFixed(0)} tCO₂e (${percentDiff}%) ABOVE the industry standard of ${standard} tCO₂e for ${latestData.year}.`;
    } else {
      result = `✅ ${company.name} is ${Math.abs(difference).toFixed(0)} tCO₂e (${Math.abs(Number(percentDiff))}%) BELOW the industry standard of ${standard} tCO₂e for ${latestData.year}.`;
    }

    setComparisonResult(result);
    toast({
      title: "Comparison Complete",
      description: "Industry standard comparison has been generated.",
    });
  };

  if (!companyId) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">No company selected</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="mb-8">
              <Button variant="ghost" className="mb-4 gap-2" asChild>
                <a href="/companies">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Companies
                </a>
              </Button>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                {company?.name || "Loading..."} Dashboard
              </h1>
              <p className="text-muted-foreground">
                {company?.industry ? `${company.industry} • ` : ""}Sustainability metrics and industry comparison
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">{stats.totalReports}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Emissions</CardTitle>
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">
                    {stats.avgEmissions.toFixed(0)} <span className="text-sm font-normal text-muted-foreground">tCO₂e</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Latest Year</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">{stats.latestYear || "—"}</div>
                </CardContent>
              </Card>
            </div>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>GHG Emissions Over Time</CardTitle>
                <CardDescription>Yearly emissions trend for {company?.name}</CardDescription>
              </CardHeader>
              <CardContent>
                {emissionsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={emissionsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="emissions" fill="hsl(var(--primary))" name="Emissions (tCO₂e)" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[400px] items-center justify-center text-muted-foreground">
                    No emissions data available yet. Add reports to see analytics.
                  </div>
                )}
              </CardContent>
            </Card>

            {emissionsData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Industry Standard Comparison</CardTitle>
                  <CardDescription>Compare against industry benchmarks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button onClick={handleCompare} className="w-full md:w-auto">
                    Compare to Industry Standard
                  </Button>
                  
                  {comparisonResult && (
                    <div className="mt-4 p-4 rounded-lg bg-muted">
                      <p className="text-sm font-medium">{comparisonResult}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-8 h-[calc(100vh-6rem)]">
              <ReportsChat companyId={companyId!} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
