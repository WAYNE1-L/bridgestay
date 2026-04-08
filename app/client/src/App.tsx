import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ListingsProvider } from "./contexts/ListingsContext";
import Home from "./pages/Home";
import Apartments from "./pages/Apartments";
import ApartmentDetail from "./pages/ApartmentDetail";
import Dashboard from "./pages/Dashboard";
import Apply from "./pages/Apply";
import HowItWorks from "./pages/HowItWorks";
import Documents from "./pages/Documents";
import Admin from "./pages/Admin";
import AIGenerator from "./pages/AIGenerator";
import AdminReview from "./pages/AdminReview";
import Investors from "./pages/Investors";
import ImportListing from "./pages/ImportListing";
import { AIConsultant } from "./components/AIConsultant";
import { AdminRoute } from "./components/AdminRoute";
import { useAuth } from "./_core/hooks/useAuth";
import { useEffect } from "react";
import { useLocation } from "wouter";

function AdminImportRedirect() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const devAuth = new URLSearchParams(window.location.search).get("devAuth");
    const devAuthQuery =
      devAuth === "guest" || devAuth === "demoAdmin" ? `?devAuth=${devAuth}` : "";
    navigate(`/admin/import${devAuthQuery}`, { replace: true });
  }, [navigate]);

  return null;
}

function AdminPage() {
  return (
    <AdminRoute>
      <Admin />
    </AdminRoute>
  );
}

function AdminGeneratorPage() {
  return (
    <AdminRoute>
      <AIGenerator />
    </AdminRoute>
  );
}

function AdminReviewPage() {
  return (
    <AdminRoute>
      <AdminReview />
    </AdminRoute>
  );
}

function AdminImportPage() {
  return (
    <AdminRoute>
      <ImportListing />
    </AdminRoute>
  );
}

function LegacyImportPage() {
  return (
    <AdminRoute>
      <AdminImportRedirect />
    </AdminRoute>
  );
}

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/apartments"} component={Apartments} />
      <Route path={"/apartments/:id"} component={ApartmentDetail} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/apply/:id"} component={Apply} />
      <Route path={"/how-it-works"} component={HowItWorks} />
      <Route path={"/documents"} component={Documents} />
      <Route path={"/admin"} component={AdminPage} />
      <Route path={"/admin/generator"} component={AdminGeneratorPage} />
      <Route path={"/admin/review"} component={AdminReviewPage} />
      <Route path={"/admin/import"} component={AdminImportPage} />
      <Route path={"/investors"} component={Investors} />
      <Route path={"/import-listing"} component={LegacyImportPage} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

/** Only render the mock AI chatbot for authenticated admins (demo feature). */
function AdminAIConsultant() {
  const { user } = useAuth();
  if (user?.role !== "admin") return null;
  return <AIConsultant />;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <LanguageProvider>
          <ListingsProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
              <AdminAIConsultant />
            </TooltipProvider>
          </ListingsProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
