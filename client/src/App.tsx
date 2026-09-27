import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { canManageChurchSettings } from "@shared/roles";
import { canAccessRoute } from "@/lib/routeAccess";
import { trpc } from "@/lib/trpc";
import { hasSkippedSetup } from "@/lib/setupSkip";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// Pages are loaded on demand so the initial bundle contains only the app shell
// and the route chunk the user actually opens.
const NotFound = lazy(() => import("@/pages/NotFound"));
const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ChurchSetup = lazy(() => import("./pages/ChurchSetup"));
const Transactions = lazy(() => import("./pages/Transactions"));
const TransactionDetail = lazy(() => import("./pages/TransactionDetail"));
const Counting = lazy(() => import("./pages/Counting"));
const CountingDetail = lazy(() => import("./pages/CountingDetail"));
const Offerings = lazy(() => import("./pages/Offerings"));
const NewOffering = lazy(() => import("./pages/NewOffering"));
const Expenses = lazy(() => import("./pages/Expenses"));
const NewExpense = lazy(() => import("./pages/NewExpense"));
const NewWithdrawal = lazy(() => import("./pages/NewWithdrawal"));
const Funds = lazy(() => import("./pages/Funds"));
const FundDetail = lazy(() => import("./pages/FundDetail"));
const Budgets = lazy(() => import("./pages/Budgets"));
const BudgetDetail = lazy(() => import("./pages/BudgetDetail"));
const Ministries = lazy(() => import("./pages/Ministries"));
const MinistryDetail = lazy(() => import("./pages/MinistryDetail"));
const Members = lazy(() => import("./pages/Members"));
const MemberDetail = lazy(() => import("./pages/MemberDetail"));
const Reports = lazy(() => import("./pages/Reports"));
const Approvals = lazy(() => import("./pages/Approvals"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Settings = lazy(() => import("./pages/Settings"));
const Profile = lazy(() => import("./pages/Profile"));
const Updates = lazy(() => import("./pages/Updates"));
const GivingInbox = lazy(() => import("./pages/GivingInbox"));
const ComponentShowcase = lazy(() => import("./pages/ComponentShowcase"));

/** Routes reachable without a session. Everything else needs one. */
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/404",
  ...(import.meta.env.DEV ? ["/ui-showcase"] : []),
];

function normalizePath(path: string) {
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

/**
 * Sends signed-out visitors to /login. Without this the app shell renders for
 * anyone and every query fails with UNAUTHORIZED, which reads as a broken page
 * rather than as "please sign in".
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const isPublic = PUBLIC_PATHS.includes(normalizePath(location));

  useEffect(() => {
    if (loading || isPublic || isAuthenticated) return;
    setLocation("/login");
  }, [loading, isPublic, isAuthenticated, setLocation]);

  if (isPublic) return <>{children}</>;
  if (loading) return <RouteLoading />;
  if (!isAuthenticated) return <RouteLoading />;
  return <>{children}</>;
}

const SETUP_EXEMPT_PATHS = [
  "/setup",
  "/login",
  "/register",
  "/404",
  // Dev-only UI gallery; the route itself is also unmounted in prod (see Router).
  ...(import.meta.env.DEV ? ["/ui-showcase"] : []),
];

// Hybrid onboarding gate: logged-in users whose church profile is missing or
// not yet set up are nudged to the wizard — unless they skipped it in this
// tab, are already on an exempt page, or the profile query failed
// (offline-safe: never trap the user when the DB is unreachable).
function SetupGate() {
  const [location, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const profileQuery = trpc.church.getProfile.useQuery(undefined, {
    enabled: !!user,
    retry: false,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (loading || !user) return;
    // Normalize trailing slashes so e.g. "/setup/" still matches the exempt list.
    const normalizedLocation =
      location.length > 1 ? location.replace(/\/+$/, "") : location;
    if (SETUP_EXEMPT_PATHS.includes(normalizedLocation)) return;
    if (hasSkippedSetup()) return;
    if (profileQuery.isLoading || profileQuery.isError) return;
    const profile = profileQuery.data;
    if (
      canManageChurchSettings(user) &&
      (!profile || !profile.setupCompleted)
    ) {
      setLocation("/setup");
    }
  }, [
    loading,
    user,
    location,
    profileQuery.isLoading,
    profileQuery.isError,
    profileQuery.data,
    setLocation,
  ]);

  return null;
}

function RouteLoading() {
  return (
    <div
      className="min-h-[50vh] flex items-center justify-center px-6"
      role="status"
      aria-live="polite"
    >
      <div className="w-full max-w-md space-y-3">
        <div className="h-8 w-40 rounded-xl bg-[#E5E1D8]/60 animate-pulse" />
        <div className="h-24 w-full rounded-2xl bg-[#E5E1D8]/40 animate-pulse" />
        <p className="text-center text-sm text-[#7A766F]">กำลังโหลดหน้า…</p>
      </div>
    </div>
  );
}

function RoleGuard({
  children,
  canAccess,
  title = "สิทธิ์การเข้าถึงถูกจำกัด",
  message = "คุณไม่มีสิทธิ์เข้าถึงส่วนนี้ หากจำเป็นต้องใช้งาน กรุณาติดต่อผู้ดูแลระบบสูงสุด",
}: {
  children: React.ReactNode;
  canAccess: (user: any) => boolean;
  title?: string;
  message?: string;
}) {
  const { user, loading } = useAuth();
  if (loading) return <RouteLoading />;
  if (!user || !canAccess(user)) {
    return (
      <div className="min-h-screen bg-[#FFFFFF] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#FFFFFF] rounded-3xl p-8 border-2 border-[#E5E1D8] text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-rose-100 border-2 border-rose-200 mx-auto flex items-center justify-center text-rose-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-8 h-8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-[#171717]">{title}</h2>
          <p className="text-sm text-[#7A766F] leading-relaxed">{message}</p>
          <div className="pt-2">
            <a
              href="/"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-[#F97316] text-[#171717] font-bold text-sm hover:bg-[#D95E0B] transition-all shadow-xs"
            >
              กลับสู่หน้าหลัก
            </a>
          </div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      {/* Core & Auth */}
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/setup" component={ChurchSetup} />

      {/* Transactions & Ledgers */}
      <Route path="/transactions" component={Transactions} />
      <Route path="/transactions/:id" component={TransactionDetail} />

      {/* Offerings */}
      {/* Weekly offering count */}
      <Route path="/counting">
        <RoleGuard
          canAccess={u => canAccessRoute("/counting", u)}
          message="ส่วนการนับเงินถวายสงวนไว้สำหรับเหรัญญิกหรือคณะกรรมการนับเงินเท่านั้น"
        >
          <Counting />
        </RoleGuard>
      </Route>
      <Route path="/counting/:id">
        <RoleGuard
          canAccess={u => canAccessRoute("/counting", u)}
          message="ส่วนการนับเงินถวายสงวนไว้สำหรับเหรัญญิกหรือคณะกรรมการนับเงินเท่านั้น"
        >
          <CountingDetail />
        </RoleGuard>
      </Route>

      <Route path="/offerings" component={Offerings} />
      <Route path="/offerings/new" component={NewOffering} />

      {/* LINE Giving Inbox */}
      <Route path="/giving/inbox">
        <RoleGuard
          canAccess={u => canAccessRoute("/giving/inbox", u)}
          message="ส่วนกล่องข้อความสลิปสงวนไว้สำหรับเหรัญญิกหรือผู้มีสิทธิ์จัดการการเงินเท่านั้น"
        >
          <GivingInbox />
        </RoleGuard>
      </Route>
      <Route path="/giving-inbox">
        <RoleGuard
          canAccess={u => canAccessRoute("/giving/inbox", u)}
          message="ส่วนกล่องข้อความสลิปสงวนไว้สำหรับเหรัญญิกหรือผู้มีสิทธิ์จัดการการเงินเท่านั้น"
        >
          <GivingInbox />
        </RoleGuard>
      </Route>

      {/* Expenses */}
      <Route path="/expenses">
        <RoleGuard
          canAccess={u => canAccessRoute("/expenses", u)}
          message="ส่วนการจัดการรายจ่ายสงวนไว้สำหรับเหรัญญิกหรือผู้มีสิทธิ์จัดการการเงินเท่านั้น"
        >
          <Expenses />
        </RoleGuard>
      </Route>
      <Route path="/expenses/new">
        <RoleGuard
          canAccess={u => canAccessRoute("/expenses", u)}
          message="ส่วนการบันทึกรายจ่ายสงวนไว้สำหรับเหรัญญิกหรือผู้มีสิทธิ์จัดการการเงินเท่านั้น"
        >
          <NewExpense />
        </RoleGuard>
      </Route>

      {/* Funds & Accounts */}
      <Route path="/funds">
        <RoleGuard
          canAccess={u => canAccessRoute("/funds", u)}
          message="ส่วนกองทุนสงวนไว้สำหรับเหรัญญิกหรือคณะกรรมการเท่านั้น"
        >
          <Funds />
        </RoleGuard>
      </Route>
      <Route path="/funds/:id">
        <RoleGuard
          canAccess={u => canAccessRoute("/funds", u)}
          message="ส่วนกองทุนสงวนไว้สำหรับเหรัญญิกหรือคณะกรรมการเท่านั้น"
        >
          <FundDetail />
        </RoleGuard>
      </Route>

      {/* Budgets */}
      <Route path="/budgets">
        <RoleGuard
          canAccess={u => canAccessRoute("/budgets", u)}
          message="ส่วนงบประมาณสงวนไว้สำหรับเหรัญญิกหรือคณะกรรมการงบประมาณเท่านั้น"
        >
          <Budgets />
        </RoleGuard>
      </Route>
      <Route path="/budgets/:id">
        <RoleGuard
          canAccess={u => canAccessRoute("/budgets", u)}
          message="ส่วนงบประมาณสงวนไว้สำหรับเหรัญญิกหรือคณะกรรมการงบประมาณเท่านั้น"
        >
          <BudgetDetail />
        </RoleGuard>
      </Route>

      {/* Ministries & Team */}
      <Route path="/ministries" component={Ministries} />
      <Route path="/ministries/:id" component={MinistryDetail} />

      {/* Members Directory */}
      <Route path="/members">
        <RoleGuard
          canAccess={u => canAccessRoute("/members", u)}
          message="ส่วนทะเบียนสมาชิกสงวนไว้สำหรับคณะกรรมการคริสตจักรเท่านั้น"
        >
          <Members />
        </RoleGuard>
      </Route>
      <Route path="/members/:id">
        <RoleGuard
          canAccess={u => canAccessRoute("/members", u)}
          message="ส่วนทะเบียนสมาชิกสงวนไว้สำหรับคณะกรรมการคริสตจักรเท่านั้น"
        >
          <MemberDetail />
        </RoleGuard>
      </Route>

      {/* Reports & Analytics */}
      <Route path="/reports">
        <RoleGuard
          canAccess={u => canAccessRoute("/reports", u)}
          message="รายงานทางการเงินและสถิติคริสตจักรสงวนไว้สำหรับผู้ได้รับอนุญาตเท่านั้น"
        >
          <Reports />
        </RoleGuard>
      </Route>

      {/* Approvals & Workflows */}
      <Route path="/approvals">
        <RoleGuard
          canAccess={u => canAccessRoute("/approvals", u)}
          message="ส่วนการอนุมัติโครงการและการเงินสงวนไว้สำหรับผู้อนุมัติเท่านั้น"
        >
          <Approvals />
        </RoleGuard>
      </Route>

      {/* Withdrawal requests — any signed-in member can ask for one;
          approval/disbursement stays gated on the Approvals page. */}
      <Route path="/withdrawals/new" component={NewWithdrawal} />

      {/* Notifications */}
      <Route path="/notifications" component={Notifications} />

      {/* Church & System Settings */}
      <Route path="/settings">
        <RoleGuard
          canAccess={u => canAccessRoute("/settings", u)}
          message="หน้านี้สงวนไว้สำหรับผู้ดูแลระบบสูงสุด (SUPER_ADMIN) เท่านั้น เพื่อความปลอดภัยของข้อมูลคริสตจักรและการกำหนดสิทธิ์ผู้ใช้งาน"
        >
          <Settings />
        </RoleGuard>
      </Route>

      {/* User Profile */}
      <Route path="/profile" component={Profile} />

      {/* News & Updates */}
      <Route path="/updates" component={Updates} />

      {/* Dev UI showcase (incl. adapted ObsidianUI components) — dev builds
          only; statically stripped from production bundles. */}
      {import.meta.env.DEV && (
        <Route path="/ui-showcase" component={ComponentShowcase} />
      )}

      {/* 404 Fallback */}
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
          <Toaster position="top-center" richColors />
          <SetupGate />
          <Suspense fallback={<RouteLoading />}>
            <AuthGate>
              <Router />
            </AuthGate>
          </Suspense>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
