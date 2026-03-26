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
import { AIConsultant } from "./components/AIConsultant";

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
      <Route path={"/admin"} component={Admin} />
      <Route path={"/admin/generator"} component={AIGenerator} />
      <Route path={"/admin/review"} component={AdminReview} />
      <Route path={"/investors"} component={Investors} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
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
              <AIConsultant />
            </TooltipProvider>
          </ListingsProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
