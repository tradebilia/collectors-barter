import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import ItemDetail from "./pages/ItemDetail";
import Inventory from "./pages/Inventory";
import AddInventory from "./pages/AddInventory";
import Profile from "./pages/Profile";
import Messages from "./pages/Messages";
import MemberSearch from "./pages/MemberSearch";
import CategoryPage from "./pages/CategoryPage";
import ReportUser from "./pages/ReportUser";
import ReferralRequest from "./pages/ReferralRequest";
import Watchlist from "./pages/Watchlist";
import { EditInventory } from "./pages/EditInventory";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/inventory" component={Inventory} />
      <Route path="/inventory/new" component={AddInventory} />
      <Route path="/inventory/:id/edit" component={EditInventory} />
      <Route path="/profile" component={Profile} />
      <Route path="/messages" component={Messages} />
      <Route path="/members" component={MemberSearch} />
      <Route path="/report-user" component={ReportUser} />
      <Route path="/referral-request" component={ReferralRequest} />
      <Route path="/watchlist" component={Watchlist} />
      <Route path="/category/:slug" component={CategoryPage} />
      <Route path="/listings/:listingId" component={ItemDetail} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
