import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navigation from "@/components/layout/Navigation";
import ReportsChat from "@/components/dashboard/ReportsChat";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  ArrowLeft,
  Droplets,
  Factory,
  Leaf,
  Recycle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { mockCompanies, mockReports, type MockReport } from "@/data/mockReports";
import { fetchDemoReportsDataset, type ReportDataSource } from "@/data/demoReports";

interface Company {
  id: number;
  name: string;
  industry: string | null;
}

const formatNumber = (value: number) => value.toLocaleString();

const Dashboard = () => {
  const { companyId } = useParams();
  const numericCompanyId = useMemo(() => Number(companyId || mockReports[0].companyId), [companyId]);

  const [company, setCompany] = useState<Company | null>(null);
  const [reports, setReports] = useState<MockReport[]>([]);
  const [dataSource, setDataSource] = useState<ReportDataSource>("Mock Demo Data");

  useEffect(() => {
    void fetchDashboardData();
  }, [numericCompanyId]);

  const useMockDashboard = () => {
    const selected =
      mockReports.find((report) => report.companyId === numericCompanyId) || mockReports[0];
    setCompany({
      id: selected.companyId,
      name: selected.companyName,
      industry: selected.sector,
    });
    setReports(mockReports.filter((report) => report.companyId === selected.companyId));
    setDataSource("Mock Demo Data");
  };

  const fetchDashboardData = async () => {
    const dataset = await fetchDemoReportsDataset();
    const selectedReport =
      dataset.reports.find((report) => report.companyId === numericCompanyId) ||
      dataset.reports[0];

    if (!selectedReport) {
      useMockDashboard();
      return;
    }

    setCompany({
      id: selectedReport.companyId,
      name: selectedReport.companyName,
      industry: selectedReport.sector,
    });
    setReports(
      dataset.reports
        .filter((report) => report.companyId === selectedReport.companyId)
        .sort((a, b) => b.year - a.year)
    );
    setDataSource(dataset.source);
  };

  const latestReport = reports[0] || mockReports[0];
  const timeSeries = latestReport.timeSeries;
  const peerComparison =
    latestReport.peerComparison && latestReport.peerComparison.length > 0
      ? latestReport.peerComparison
      : reports.map((report) => ({
          company: report.companyName,
          esgScore: report.esgScore,
          carbonEmissions: report.carbonEmissions,
          renewableEnergyPercentage: report.renewableEnergyPercentage,
        }));

  const summaryCards = [
    {
      title: "ESG Score",
      value: latestReport.esgScore ? `${latestReport.esgScore}/100` : "N/A",
      icon: Activity,
      detail: `${latestReport.year} disclosure`,
    },
    {
      title: "Carbon Emissions",
      value: `${formatNumber(latestReport.carbonEmissions)} tCO2e`,
      icon: Factory,
      detail: "Scope 1, 2 and 3 total",
    },
    {
      title: "Renewable Energy",
      value: `${latestReport.renewableEnergyPercentage}%`,
      icon: Leaf,
      detail: "Share of electricity mix",
    },
    {
      title: "Water Usage",
      value: `${formatNumber(latestReport.waterUsage)} m3`,
      icon: Droplets,
      detail: "Annual withdrawal",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <Button variant="ghost" className="mb-4 gap-2" asChild>
              <Link to="/companies">
                <ArrowLeft className="h-4 w-4" />
                Back to Companies
              </Link>
            </Button>

            <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
              <div>
                <h1 className="text-4xl font-bold text-foreground">
                  {company?.name || "Sustainability"} Dashboard
                </h1>
                <p className="mt-2 text-muted-foreground">
                  {company?.industry ? `${company.industry} sector ESG performance` : "ESG performance"}
                </p>
              </div>
              <span className="w-fit rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-foreground">
                Data source: {dataSource}
              </span>
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map(({ title, value, detail, icon: Icon }) => (
                <Card key={title}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{title}</CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">{value}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mb-6 grid gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Peer Comparison</CardTitle>
                  <CardDescription>ESG score and renewable energy performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={peerComparison}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="company" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="esgScore" fill="hsl(var(--primary))" name="ESG score" />
                      <Bar
                        dataKey="renewableEnergyPercentage"
                        fill="hsl(var(--secondary))"
                        name="Renewable energy %"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Time Series</CardTitle>
                  <CardDescription>Carbon emissions trend for {latestReport.companyName}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={timeSeries}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="carbonEmissions"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        name="Carbon emissions (tCO2e)"
                      />
                      <Line
                        type="monotone"
                        dataKey="esgScore"
                        stroke="hsl(var(--secondary))"
                        strokeWidth={2}
                        name="ESG score"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Report Table</CardTitle>
                <CardDescription>Sustainability metrics from the selected data source</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>ESG</TableHead>
                      <TableHead>Carbon</TableHead>
                      <TableHead>Water</TableHead>
                      <TableHead>Energy</TableHead>
                      <TableHead>Renewable</TableHead>
                      <TableHead>Waste</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">{report.companyName}</TableCell>
                        <TableCell>{report.year}</TableCell>
                        <TableCell>{report.esgScore}</TableCell>
                        <TableCell>{formatNumber(report.carbonEmissions)} tCO2e</TableCell>
                        <TableCell>{formatNumber(report.waterUsage)} m3</TableCell>
                        <TableCell>{formatNumber(report.energyUsage)} MWh</TableCell>
                        <TableCell>{report.renewableEnergyPercentage}%</TableCell>
                        <TableCell>{formatNumber(report.wasteGenerated)} t</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Anomaly Notes</CardTitle>
                <CardDescription>Review flags for the latest selected report</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {latestReport.anomalyNotes.map((note) => (
                    <div key={note} className="flex gap-3 rounded-md border p-3">
                      <Recycle className="mt-0.5 h-4 w-4 flex-none text-primary" />
                      <p className="text-sm text-muted-foreground">{note}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="min-h-[560px]">
            <div className="sticky top-8 h-[calc(100vh-6rem)]">
              <ReportsChat companyId={String(numericCompanyId || mockCompanies[0].id)} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
