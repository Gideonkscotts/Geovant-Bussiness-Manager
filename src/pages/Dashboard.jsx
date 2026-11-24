import { useEffect, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  ChartNoAxesCombined,
  Loader2,
  Package,
  Users,
} from "lucide-react";
import { api } from "../lib/api";

function money(value) {
  return `K${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const STATUS_LABELS = {
  paid: "Paid",
  partial: "Part paid",
  unpaid: "Unpaid",
  voided: "Voided",
};

const STATUS_STYLES = {
  paid: "bg-green-500/10 text-green-400",
  partial: "bg-yellow-500/10 text-yellow-400",
  unpaid: "bg-red-500/10 text-red-400",
  voided: "bg-gray-500/10 text-gray-400",
};

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

export default function Dashboard({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    api
      .get("/dashboard/summary")
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (active) setError(err.message || "Unable to load the dashboard.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-gray-400">
        <Loader2 size={22} className="mr-3 animate-spin" />
        Loading your business overview...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
        {error}
      </div>
    );
  }

  const recent = data.recent_sales || [];

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
          value={money(data.total_sales)}
          description="all completed sales"
          icon={ArrowUpRight}
          trend={`Today: ${money(data.sales_today)}`}
          positive
        />

        <StatCard
          title="Total Expenses"
          value={money(data.total_expenses)}
          description="recorded expenses"
          icon={ArrowDownRight}
          trend={data.total_expenses > 0 ? "Live data" : "None recorded"}
        />

        <StatCard
          title="Available Stock"
          value={Number(data.total_stock).toLocaleString("en-US")}
          description="units in stock"
          icon={Boxes}
          trend={`${data.low_stock_count} low, ${data.out_of_stock_count} out`}
        />

        <StatCard
          title="Profit"
          value={money(data.profit)}
          description="sales minus expenses"
          icon={ChartNoAxesCombined}
          trend={data.profit >= 0 ? "In profit" : "In loss"}
          positive={data.profit >= 0}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <StatCard
          title="Owed by customers"
          value={money(data.outstanding_credit)}
          description="unpaid on credit sales"
          icon={Users}
          trend={data.outstanding_credit > 0 ? "Follow up" : "All paid"}
          positive={data.outstanding_credit === 0}
        />

        <StatCard
          title="Items to restock"
          value={String(data.low_stock_count + data.out_of_stock_count)}
          description="low or out of stock"
          icon={Package}
          trend={
            data.low_stock_count + data.out_of_stock_count > 0
              ? "Check Inventory"
              : "Stock is healthy"
          }
          positive={data.low_stock_count + data.out_of_stock_count === 0}
        />
      </div>

      <section className="overflow-hidden rounded-xl border border-white/10 bg-[#171a21]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 p-5">
          <div>
            <h3 className="font-semibold">Recent Transactions</h3>
            <p className="mt-1 text-xs text-gray-400">Your latest sales</p>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate("Sales")}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              View all sales
            </button>
          )}
        </div>

        {recent.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            No sales yet. Record your first sale from the Sales page.
          </div>
        ) : (
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
                {recent.map((sale) => {
                  const status =
                    sale.status === "voided" ? "voided" : sale.payment_status;

                  return (
                    <tr
                      key={sale.id}
                      className="border-t border-white/5 hover:bg-white/[0.02]"
                    >
                      <td className="px-5 py-4 font-medium">
                        {sale.items_summary || sale.sale_number}
                        {sale.customer_name && (
                          <span className="ml-2 text-xs text-gray-500">
                            {sale.customer_name}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-green-400">Sale</td>
                      <td className="px-5 py-4">{money(sale.total)}</td>
                      <td className="px-5 py-4 text-gray-400">
                        {formatDate(sale.sold_at)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs ${STATUS_STYLES[status]}`}
                        >
                          {STATUS_LABELS[status]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
