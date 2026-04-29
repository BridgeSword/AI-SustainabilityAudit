import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams, useSearchParams } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Companies from "./pages/Companies";
import SectorRanking from "./pages/SectorRanking";
import InnovativeActionDetect from "./pages/InnovativeActionDetect";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ReportsAlias = () => {
  const [searchParams] = useSearchParams();
  const companyId = searchParams.get("company");
  return <Navigate to={companyId ? `/report-analysis/${companyId}` : "/report-analysis"} replace />;
};

const InnovativeActionAlias = () => {
  const { companyId } = useParams();
  return <Navigate to={companyId ? `/report-analysis/${companyId}` : "/report-analysis"} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/:companyId" element={<Dashboard />} />
          <Route path="/companies" element={<Companies />} />
          <Route path="/sector-ranking" element={<SectorRanking />} />
          <Route path="/report-analysis" element={<InnovativeActionDetect />} />
          <Route path="/report-analysis/:companyId" element={<InnovativeActionDetect />} />
          <Route path="/reports" element={<ReportsAlias />} />
          <Route path="/innovative-action-detect" element={<InnovativeActionAlias />} />
          <Route path="/innovative-action-detect/:companyId" element={<InnovativeActionAlias />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
