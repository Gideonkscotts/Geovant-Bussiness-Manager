
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Wallet,
  Users,
  Truck,
  ChartNoAxesCombined,
  Settings,
  Bell,
  Menu,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Boxes,
  Activity,
  LogOut,
} from "lucide-react";

import Inventory from "./pages/Inventory";
import Auth from "./pages/Auth";
import { supabase } from "./lib/supabase";

const navigation = [
  {
    title: "WORKSPACE",
    items: [
      { name: "Dashboard", icon: LayoutDashboard },
      { name: "Sales", icon: ShoppingCart },
      { name: "Inventory", icon: Package },
      { name: "Expenses", icon: Wallet },
    ],
  },
  {
    title: "MANAGEMENT",
    items: [
      { name: "Customers", icon: Users },
      { name: "Suppliers", icon: Truck },
      { name: "Reports", icon: ChartNoAxesCombined },
      { name: "Settings", icon: Settings },
    ],
  },
];

const demoTransactions = [
  {
    id: 1,
    description: "Cooking oil x 15",
    type: "Sale",
    amount: "K1,500.00",
    date: "19 Nov 2026",
    status: "Completed",
  },
  {
    id: 2,
    description: "Transport",
    type: "Expense",
    amount: "K32.00",
    date: "18 Nov 2026",
    status: "Completed",
  },
  {
    id: 3,
    description: "Salt x 2",
    type: "Sale",
    amount: "K40.00",
    date: "18 Nov 2026",
    status: "Completed",
  },
];

function Sidebar({ activePage, setActivePage, isOpen, closeSidebar }) {
  return (
    <>
      {isOpen && (
        <button
          aria-label="Close navigation"
          onClick={closeSidebar}
          className="fixed inset-0 z-40 bg-black/70 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/10 bg-[#101217] transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
          <div>
            <h1 className="text-2xl font-black tracking-widest">
              GEOVANT<span className="text-blue-500">.</span>
            </h1>
            <p className="mt-1 text-[9px] tracking-[0.3em] text-gray-400">
              BUSINESS MANAGER
            </p>
          </div>

          <button
            onClick={closeSidebar}
            className="text-gray-400 hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={22} />
          </button>
        </div>

        <nav className="flex-1 space-y-8 overflow-y-auto px-4 py-8">
          {navigation.map((group) => (
            <div key={group.title}>
              <p className="mb-4 px-3 text-[10px] font-bold tracking-[0.2em] text-gray-500">
                {group.title}
              </p>

              <div className="space-y-2">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = activePage === item.name;

                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        setActivePage(item.name);
                        closeSidebar();
                      }}
                      className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm transition ${
                        active
                          ? "border-l-2 border-blue-500 bg-blue-500/15 font-semibold text-blue-400"
                          : "text-gray-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon size={18} />
                      {item.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-5">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            System running
          </div>
          <p className="mt-2 text-[10px] text-gray-600">
            GEOVANT TECHNOLOGIES © 2026
          </p>
        </div>
      </aside>
    </>
  );
}

function StatCard({ title, value, description, icon: Icon, trend, positive }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#171a21] p-5 transition hover:border-blue-500/40">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{title}</p>
        <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
          <Icon size={19} />
        </div>
      </div>

      <h2 className="mt-5 text-2xl font-bold tracking-tight">{value}</h2>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className={positive ? "text-green-400" : "text-gray-400"}>
          {trend}
        </span>
        <span className="text-gray-500">{description}</span>
      </div>
    </div>
  );
}

function Dashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Welcome back!</h2>
        <p className="mt-2 text-sm text-gray-400">
          Here's an overview of your business.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Sales"
          value="K1,640.00"
          description="Recorded sales"
          icon={ArrowUpRight}
          trend="Demo data"
          positive
        />

        <StatCard
          title="Total Expenses"
          value="K232.00"
          description="Recorded expenses"
          icon={ArrowDownRight}
          trend="Demo data"
        />

        <StatCard
          title="Available Stock"
          value="4,338"
          description="Demo stock units"
          icon={Boxes}
          trend="Not connected"
        />

        <StatCard
          title="Profit"
          value="K1,408.00"
          description="Sales minus expenses"
          icon={ChartNoAxesCombined}
          trend="Demo calculation"
          positive
        />
      </div>

      <section className="overflow-hidden rounded-xl border border-white/10 bg-[#171a21]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 p-5">
          <div>
            <h3 className="font-semibold">Recent Transactions</h3>
            <p className="mt-1 text-xs text-gray-400">
              Example business activities
            </p>
          </div>
          <span className="text-xs text-blue-400">Demonstration</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="bg-[#1d222c] text-xs uppercase tracking-wider text-gray-400">
              <tr>
                <th className="px-5 py-4">Description</th>
                <th className="px-5 py-4">Type</th>
                <th className="px-5 py-4">Amount</th>
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Status</th>
              </tr>
            </thead>

            <tbody>
              {demoTransactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  className="border-t border-white/5 hover:bg-white/[0.02]"
                >
                  <td className="px-5 py-4 font-medium">
                    {transaction.description}
                  </td>
                  <td
                    className={`px-5 py-4 ${
                      transaction.type === "Sale"
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {transaction.type}
                  </td>
                  <td className="px-5 py-4">{transaction.amount}</td>
                  <td className="px-5 py-4 text-gray-400">
                    {transaction.date}
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-400">
                      {transaction.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-[#171a21] p-6">
          <Package size={24} className="mb-4 text-blue-400" />
          <h3 className="font-semibold">Inventory management</h3>
          <p className="mt-2 text-sm text-gray-400">
            Manage products, prices and available stock.
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#171a21] p-6">
          <Activity size={24} className="mb-4 text-blue-400" />
          <h3 className="font-semibold">Business performance</h3>
          <p className="mt-2 text-sm text-gray-400">
            Monitor business activity and performance.
          </p>
        </div>
      </div>
    </div>
  );
}

function PlaceholderPage({ title }) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-[#171a21] p-8 text-center">
      <div className="mb-4 rounded-xl bg-blue-500/10 p-4 text-blue-400">
        <Boxes size={30} />
      </div>
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-2 max-w-sm text-sm text-gray-400">
        This section is being prepared. We'll build its functionality next.
      </p>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [activePage, setActivePage] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        console.error("Session error:", error.message);
      }

      setSession(data?.session ?? null);
      setCheckingSession(false);
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (mounted) {
        setSession(newSession);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    setLoggingOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error.message);
      alert("Unable to log out. Please try again.");
    }

    setLoggingOut(false);
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0d12] text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <p className="text-sm text-gray-400">
            Loading GEOVANT BUSINESS MANAGER...
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  const user = session.user;
  const fullName =
    user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
  const businessName =
    user.user_metadata?.business_name || "Business account";

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-[#0b0d12] text-white">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        isOpen={sidebarOpen}
        closeSidebar={closeSidebar}
      />

      <div className="min-h-screen lg:pl-64">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-white/10 bg-[#0b0d12]/95 px-5 backdrop-blur-lg md:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
              className="rounded-lg border border-white/10 p-2 text-gray-300 hover:bg-white/5 lg:hidden"
            >
              <Menu size={21} />
            </button>

            <div>
              <p className="text-[10px] tracking-[0.2em] text-blue-400">
                GEOVANT TECHNOLOGIES
              </p>
              <h1 className="mt-1 text-lg font-bold">{activePage}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              aria-label="Notifications"
              className="relative rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white"
            >
              <Bell size={20} />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-500" />
            </button>

            <div className="hidden items-center gap-3 border-l border-white/10 pl-4 sm:flex">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 font-bold">
                {fullName.charAt(0).toUpperCase()}
              </div>
              <div className="max-w-[150px]">
                <p className="truncate text-sm font-semibold">{fullName}</p>
                <p className="truncate text-[10px] text-gray-400">
                  {businessName}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              title="Log out"
              aria-label="Log out"
              className="rounded-lg border border-white/10 p-2 text-gray-400 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
            >
              <LogOut size={19} />
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] p-5 md:p-8">
          {activePage === "Dashboard" ? (
            <Dashboard />
          ) : activePage === "Inventory" ? (
            <Inventory />
          ) : (
            <PlaceholderPage title={activePage} />
          )}
        </main>

        <footer className="border-t border-white/10 px-8 py-5 text-center text-xs text-gray-500">
          GEOVANT TECHNOLOGIES · ENGINEERING THE FUTURE.
        </footer>
      </div>
    </div>
  );
}
