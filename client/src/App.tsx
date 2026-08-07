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
import AccountSetup from "./pages/AccountSetup";
import AccountSettings from "./pages/AccountSettings";
import PublicProfile from "./pages/PublicProfile";
import SignUp from "./pages/SignUp";
import Welcome from "./pages/Welcome";
import { MemberOnly } from "./pages/MemberOnly";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { VerifyAccount } from "./pages/VerifyAccount";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ProfileCompletion } from "./pages/ProfileCompletion";
import { SearchResults } from "./pages/SearchResults";
import AdminDashboard from "./pages/AdminDashboard";
import Conventions from "./pages/Conventions";
import Contact from "./pages/Contact";
import { Forum } from "./pages/Forum";
import { ForumTopic } from "./pages/ForumTopic";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import TradeHub from "./pages/TradeHub";
import TradeShowcase from "./pages/TradeShowcase";
import WarRoom from "./pages/WarRoom";
import TradePrintView from "./pages/TradePrintView";
import TradeVoting from "./pages/TradeVoting";
import TestAI from "./pages/TestAI";
import {
  AllMostViewedRankings,
  AllMostFavoritedRankings,
  AllRatedTradersRankings,
  AllHighestTradeValuesRankings,
} from "./pages/RankingPages";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/inventory">
        <ProtectedRoute>
          <Inventory />
        </ProtectedRoute>
      </Route>
      <Route path="/inventory/new">
        <ProtectedRoute>
          <AddInventory />
        </ProtectedRoute>
      </Route>
      <Route path="/inventory/edit/:listingId">
        <ProtectedRoute>
          <AddInventory />
        </ProtectedRoute>
      </Route>
      <Route path="/profile/:userId" component={PublicProfile} />
      <Route path="/profile">
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      </Route>
      <Route path="/account-setup" component={AccountSetup} />
      <Route path="/account-settings">
        <ProtectedRoute>
          <AccountSettings />
        </ProtectedRoute>
      </Route>
      <Route path="/messages">
        <ProtectedRoute>
          <Messages />
        </ProtectedRoute>
      </Route>
      <Route path="/members">
        <ProtectedRoute>
          <MemberSearch />
        </ProtectedRoute>
      </Route>
      <Route path="/report-user">
        <ProtectedRoute>
          <ReportUser />
        </ProtectedRoute>
      </Route>
      <Route path="/referral-request">
        <ProtectedRoute>
          <ReferralRequest />
        </ProtectedRoute>
      </Route>
      <Route path="/watchlist">
        <ProtectedRoute>
          <Watchlist />
        </ProtectedRoute>
      </Route>
      <Route path="/signup" component={SignUp} />
      <Route path="/verify" component={VerifyAccount} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/profile-completion" component={ProfileCompletion} />
      <Route path="/search" component={SearchResults} />
      <Route path="/welcome" component={Welcome} />
      <Route path="/member-only" component={MemberOnly} />
      <Route path="/admin">
        <ProtectedRoute>
          <AdminDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/test-ai">
        <ProtectedRoute>
          <TestAI />
        </ProtectedRoute>
      </Route>
      <Route path="/contact" component={Contact} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/forum" component={Forum} />
      <Route path="/forum/:postId" component={ForumTopic} />
      <Route path="/category/:slug" component={CategoryPage} />

      <Route path="/trade-hub">
        <ProtectedRoute>
          <TradeHub />
        </ProtectedRoute>
      </Route>
      <Route path="/trade-room/:proposalId">
        <ProtectedRoute>
          <WarRoom />
        </ProtectedRoute>
      </Route>
      <Route path="/trade-print/:id">
        <ProtectedRoute>
          <TradePrintView />
        </ProtectedRoute>
      </Route>
      <Route path="/trade-vote/:token" component={TradeVoting} />
      <Route path="/conventions" component={Conventions} />
      <Route path="/trade-showcase" component={TradeShowcase} />
      <Route path="/rankings/most-viewed" component={AllMostViewedRankings} />
      <Route path="/rankings/most-favorited" component={AllMostFavoritedRankings} />
      <Route path="/rankings/top-rated-traders" component={AllRatedTradersRankings} />
      <Route path="/rankings/top-trade-values" component={AllHighestTradeValuesRankings} />
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
