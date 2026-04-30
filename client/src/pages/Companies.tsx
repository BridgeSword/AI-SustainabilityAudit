import { useEffect, useState } from "react";
import Navigation from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus, Search } from "lucide-react";
import { createCompany, listCompanies, type ApiCompany } from "@/lib/api";
import { mockCompanies } from "@/data/mockReports";

interface Company {
  id: number;
  name: string;
  industry: string | null;
}

const Companies = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", industry: "" });
  const { toast } = useToast();

  const normalizeCompany = (company: ApiCompany): Company => ({
    id: company.id,
    name: company.name,
    industry: company.sector,
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const data = await listCompanies();
      setCompanies(
        data.length > 0
          ? data.map(normalizeCompany)
          : mockCompanies.map(normalizeCompany)
      );
    } catch {
      setCompanies(mockCompanies.map(normalizeCompany));
      toast({
        title: "Demo data loaded",
        description: "Backend is unavailable, so sample ESG companies are shown.",
      });
    }
  };

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCompany({ name: formData.name, sector: formData.industry || null });
      toast({ title: "Success", description: "Company added successfully" });
      setFormData({ name: "", industry: "" });
      setIsDialogOpen(false);
      fetchCompanies();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add company",
        variant: "destructive",
      });
    }
  };

  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Companies</h1>
            <p className="text-muted-foreground">Manage companies and their sustainability data</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" />Add Company</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New Company</DialogTitle></DialogHeader>
              <form onSubmit={handleAddCompany} className="space-y-4">
                <div>
                  <Label htmlFor="name">Company Name *</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Exxon" required />
                </div>
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Input id="industry" value={formData.industry} onChange={(e) => setFormData({ ...formData, industry: e.target.value })} placeholder="e.g., Oil & Gas" />
                </div>
                <Button type="submit" className="w-full">Add Company</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search companies..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCompanies.map((company) => (
            <Card key={company.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10"><Building2 className="h-6 w-6 text-primary" /></div>
                  <div className="flex-1">
                    <CardTitle className="text-xl">{company.name}</CardTitle>
                    <CardDescription>{company.industry || "No industry specified"}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button variant="outline" className="flex-1" asChild><a href={`/dashboard/${company.id}`}>Dashboard</a></Button>
                <Button variant="outline" className="flex-1" asChild><a href={`/report-analysis/${company.id}`}>Reports</a></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Companies;
