import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Companies from "./pages/Companies";
import Reports from "./pages/Reports";
import SectorRanking from "./pages/SectorRanking";
import InnovativeActionDetect from "./pages/InnovativeActionDetect";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
          <Route path="/reports" element={<Reports />} />
          <Route path="/sector-ranking" element={<SectorRanking />} />
          <Route path="/innovative-action-detect" element={<InnovativeActionDetect />} />
          <Route path="/innovative-action-detect/:companyId" element={<InnovativeActionDetect />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
