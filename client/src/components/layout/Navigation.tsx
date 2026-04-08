import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BarChart3, Building2, FileText, Home, TrendingUp, Lightbulb } from "lucide-react";

const Navigation = () => {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <nav className="border-b border-border bg-card">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary">
              <BarChart3 className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">SustainAudit</span>
          </Link>
          
          <div className="flex items-center gap-2">
            <Button
              variant={isActive("/") ? "default" : "ghost"}
              asChild
            >
              <Link to="/" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Home
              </Link>
            </Button>
            <Button
              variant={isActive("/dashboard") ? "default" : "ghost"}
              asChild
            >
              <Link to="/dashboard" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            <Button
              variant={isActive("/companies") ? "default" : "ghost"}
              asChild
            >
              <Link to="/companies" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Companies
              </Link>
            </Button>
            <Button
              variant={isActive("/reports") ? "default" : "ghost"}
              asChild
            >
              <Link to="/reports" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Reports
              </Link>
            </Button>
            <Button
              variant={isActive("/sector-ranking") ? "default" : "ghost"}
              asChild
            >
              <Link to="/sector-ranking" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Sector Ranking
              </Link>
            </Button>
            <Button
              variant={isActive("/innovative-action-detect") ? "default" : "ghost"}
              asChild
            >
              <Link to="/innovative-action-detect" className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Innovative Action
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
