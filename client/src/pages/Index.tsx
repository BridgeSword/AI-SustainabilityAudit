import Navigation from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Building2, FileText, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary opacity-10" />
        <div className="container relative mx-auto px-4 py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-6 text-5xl font-bold tracking-tight text-foreground">
              Track, Analyze & Report
              <span className="block text-primary">Corporate Sustainability</span>
            </h1>
            <p className="mb-8 text-xl text-muted-foreground">
              Comprehensive GHG emissions auditing platform for enterprise sustainability reporting. 
              Monitor environmental impact across years and companies.
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" asChild className="gap-2">
                <Link to="/dashboard">
                  <BarChart3 className="h-5 w-5" />
                  View Dashboard
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/companies">
                  Explore Companies
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">Platform Features</h2>
          <p className="text-muted-foreground">Everything you need for comprehensive sustainability auditing</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Company Management</CardTitle>
              <CardDescription>
                Add and manage companies like Exxon, Shell, and track their sustainability initiatives across years
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Report Storage</CardTitle>
              <CardDescription>
                Upload and store sustainability reports with automatic organization by company and year
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Analytics & Insights</CardTitle>
              <CardDescription>
                Visualize GHG emissions trends, compare companies, and generate comprehensive sustainability analytics
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border bg-muted/30">
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">Ready to Start Auditing?</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Begin tracking corporate sustainability metrics today. Add companies, upload reports, 
            and unlock powerful analytics for environmental impact assessment.
          </p>
          <Button size="lg" asChild>
            <Link to="/companies">
              Get Started
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;
