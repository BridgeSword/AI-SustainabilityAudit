import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, FolderOpen, Search, ArrowUpDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/layout/Navigation";
import SectorRankingChat from "@/components/sector-ranking/SectorRankingChat";

interface Company {
  id: string;
  name: string;
  industry: string | null;
}

interface Report {
  id: string;
  report_year: number;
  file_name: string | null;
  file_url: string | null;
  company_id: string;
}

const InnovativeActionDetect = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // State for company list view
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companySearch, setCompanySearch] = useState("");
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyIndustry, setNewCompanyIndustry] = useState("");

  // State for report list view
  const [reports, setReports] = useState<Report[]>([]);
  const [reportSearch, setReportSearch] = useState("");
  const [sortAscending, setSortAscending] = useState(false);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [addReportOpen, setAddReportOpen] = useState(false);
  const [newReportYear, setNewReportYear] = useState("");
  const [newReportName, setNewReportName] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // External context for AI chat
  const [externalContext, setExternalContext] = useState<any>({});

  // Fetch companies
  useEffect(() => {
    fetchCompanies();
  }, []);

  // Fetch reports when companyId changes
  useEffect(() => {
    if (companyId) {
      fetchReports(companyId);
      fetchCompanyDetails(companyId);
    }
  }, [companyId]);

  // Update external context when company or report changes
  useEffect(() => {
    setExternalContext({
      view: companyId ? "reports" : "companies",
      selectedCompany,
      selectedReport,
      reports: companyId ? reports : undefined,
    });
  }, [companyId, selectedCompany, selectedReport, reports]);

  const fetchCompanies = async () => {
    setIsLoadingCompanies(true);
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("name");

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error("Error fetching companies:", error);
      toast({
        title: "Error",
        description: "Failed to load companies",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCompanies(false);
    }
  };

  const fetchCompanyDetails = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setSelectedCompany(data);
    } catch (error) {
      console.error("Error fetching company details:", error);
    }
  };

  const fetchReports = async (id: string) => {
    setIsLoadingReports(true);
    try {
      const { data, error } = await supabase
        .from("sustainability_reports")
        .select("*")
        .eq("company_id", id)
        .order("report_year", { ascending: sortAscending });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error("Error fetching reports:", error);
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
      toast({
        title: "Validation Error",
        description: "Company name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("companies")
        .insert([{ name: newCompanyName, industry: newCompanyIndustry || null }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Company added successfully",
      });

      setAddCompanyOpen(false);
      setNewCompanyName("");
      setNewCompanyIndustry("");
      fetchCompanies();
    } catch (error) {
      console.error("Error adding company:", error);
      toast({
        title: "Error",
        description: "Failed to add company",
        variant: "destructive",
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleAddReport = async () => {
    if (!newReportYear || !companyId) {
      toast({
        title: "Validation Error",
        description: "Year is required",
        variant: "destructive",
      });
      return;
    }

    try {
      let fileUrl = null;
      let fileName = null;

      if (selectedFile) {
        const fileExt = selectedFile.name.split(".").pop();
        const filePath = `${companyId}/${newReportYear}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("sustainability-reports")
          .upload(filePath, selectedFile, { upsert: true });

        if (uploadError) {
          toast({
            title: "Error",
            description: "Failed to upload file",
            variant: "destructive",
          });
          return;
        }

        const { data: urlData } = supabase.storage
          .from("sustainability-reports")
          .getPublicUrl(filePath);

        fileUrl = urlData.publicUrl;
        fileName = selectedFile.name;
      }

      const { error } = await supabase
        .from("sustainability_reports")
        .insert([{
          company_id: companyId,
          report_year: parseInt(newReportYear),
          file_name: fileName || newReportName || `Report ${newReportYear}`,
          file_url: fileUrl,
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Report added successfully",
      });

      setAddReportOpen(false);
      setNewReportYear("");
      setNewReportName("");
      setSelectedFile(null);
      fetchReports(companyId);
    } catch (error) {
      console.error("Error adding report:", error);
      toast({
        title: "Error",
        description: "Failed to add report",
        variant: "destructive",
      });
    }
  };

  const handleAnalyze = (report: Report) => {
    setSelectedReport(report);
    toast({
      title: "Analysis Started",
      description: "Report sent to AI for analysis. Check the chat on the right for results.",
    });
  };

  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(companySearch.toLowerCase())
  );

  const filteredReports = reports.filter((report) =>
    (report.file_name || "").toLowerCase().includes(reportSearch.toLowerCase())
  );

  useEffect(() => {
    if (companyId) {
      fetchReports(companyId);
    }
  }, [sortAscending]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-6">
          {/* Left side - Company/Report List */}
          <div className="flex-1">
            {!companyId ? (
              // Company List View
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h1 className="text-3xl font-bold text-foreground">Innovative Action Detect</h1>
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
                        <div>
                          <label className="text-sm font-medium text-foreground">Company Name</label>
                          <Input
                            value={newCompanyName}
                            onChange={(e) => setNewCompanyName(e.target.value)}
                            placeholder="Enter company name"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground">Industry (Optional)</label>
                          <Input
                            value={newCompanyIndustry}
                            onChange={(e) => setNewCompanyIndustry(e.target.value)}
                            placeholder="Enter industry"
                          />
                        </div>
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
                    {isLoadingCompanies ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-32" />
                      ))
                    ) : (
                      filteredCompanies.map((company) => (
                        <Card
                          key={company.id}
                          className="p-6 cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => navigate(`/innovative-action-detect/${company.id}`)}
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                              <FolderOpen className="h-6 w-6 text-primary" />
                            </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground">{company.name}</h3>
                            {company.industry && (
                              <p className="text-sm text-muted-foreground">{company.industry}</p>
                            )}
                          </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              // Report List View
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
                    className="flex items-center gap-2"
                  >
                    <ArrowUpDown className="h-4 w-4" />
                    Sort by Year ({sortAscending ? "Asc" : "Desc"})
                  </Button>
                </div>

                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Year</TableHead>
                        <TableHead>Report Name</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingReports ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                            <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                          </TableRow>
                        ))
                      ) : filteredReports.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">
                            No reports found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredReports.map((report) => (
                          <TableRow key={report.id}>
                            <TableCell className="font-medium">{report.report_year}</TableCell>
                            <TableCell>{report.file_name || "Unnamed Report"}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                onClick={() => handleAnalyze(report)}
                                className="ml-auto"
                              >
                                Analyze
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Card>
              </div>
            )}
          </div>

          {/* Right side - AI Chat */}
          <div className="w-[400px]">
            <SectorRankingChat externalContext={externalContext} />
          </div>
        </div>
      </div>

      {/* Add Report Dialog */}
      <Dialog open={addReportOpen} onOpenChange={(open) => {
        setAddReportOpen(open);
        if (!open) {
          setNewReportYear("");
          setNewReportName("");
          setSelectedFile(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add New Report - {selectedCompany?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground">Report Year *</label>
              <Input
                type="number"
                value={newReportYear}
                onChange={(e) => setNewReportYear(e.target.value)}
                placeholder="2024"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Upload Report File</label>
              <Input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                className="mt-2"
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground mt-2">
                  Selected: {selectedFile.name}
                </p>
              )}
            </div>
            <Button onClick={handleAddReport} className="w-full">
              Add Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InnovativeActionDetect;
