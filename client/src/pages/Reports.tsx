import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Navigation from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Upload } from "lucide-react";

interface Company {
  id: string;
  name: string;
}

interface Report {
  id: string;
  report_year: number;
  ghg_emissions: number | null;
  file_name: string | null;
  file_url: string | null;
  companies: {
    name: string;
  };
}

const Reports = () => {
  const [searchParams] = useSearchParams();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    company_id: searchParams.get("company") || "",
    report_year: new Date().getFullYear(),
    ghg_emissions: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCompanies();
    fetchReports();
  }, []);

  const fetchCompanies = async () => {
    const { data } = await supabase.from("companies").select("id, name").order("name");
    setCompanies(data || []);
  };

  const fetchReports = async () => {
    const { data } = await supabase
      .from("sustainability_reports")
      .select(`
        *,
        companies(name)
      `)
      .order("report_year", { ascending: false });

    setReports(data as any || []);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleAddReport = async (e: React.FormEvent) => {
    e.preventDefault();

    let fileUrl = null;
    let fileName = null;

    if (selectedFile) {
      const fileExt = selectedFile.name.split(".").pop();
      const filePath = `${formData.company_id}/${formData.report_year}.${fileExt}`;

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

    const { error } = await supabase.from("sustainability_reports").insert([
      {
        company_id: formData.company_id,
        report_year: formData.report_year,
        ghg_emissions: formData.ghg_emissions ? parseFloat(formData.ghg_emissions) : null,
        file_url: fileUrl,
        file_name: fileName,
      },
    ]);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Report added successfully",
    });

    setFormData({ company_id: "", report_year: new Date().getFullYear(), ghg_emissions: "" });
    setSelectedFile(null);
    setIsDialogOpen(false);
    fetchReports();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Sustainability Reports</h1>
            <p className="text-muted-foreground">Upload and manage sustainability reports</p>
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
                    onValueChange={(value) => setFormData({ ...formData, company_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a company" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
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
                    onChange={(e) => setFormData({ ...formData, report_year: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="emissions">GHG Emissions (tCO₂e)</Label>
                  <Input
                    id="emissions"
                    type="number"
                    step="0.01"
                    value={formData.ghg_emissions}
                    onChange={(e) => setFormData({ ...formData, ghg_emissions: e.target.value })}
                    placeholder="e.g., 125000"
                  />
                </div>
                <div>
                  <Label htmlFor="file">Upload Report File</Label>
                  <div className="mt-2">
                    <Input
                      id="file"
                      type="file"
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.xls,.xlsx"
                    />
                  </div>
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground mt-2">
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

        <div className="grid gap-4">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{report.companies.name} - {report.report_year}</CardTitle>
                      <CardDescription>
                        {report.ghg_emissions 
                          ? `${report.ghg_emissions.toLocaleString()} tCO₂e` 
                          : "No emissions data"}
                      </CardDescription>
                    </div>
                  </div>
                  {report.file_url && (
                    <Button variant="outline" asChild>
                      <a href={report.file_url} target="_blank" rel="noopener noreferrer">
                        View File
                      </a>
                    </Button>
                  )}
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        {reports.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">No reports found</p>
            <p className="text-sm text-muted-foreground mb-4">Add a report to get started</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Reports;
