import React from "react";
import { Worker, DailyYield, Sale } from "../types";
import {
  Leaf,
  Users,
  Coins,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  Award,
  CircleCheck,
  CircleAlert,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface DashboardProps {
  workers: Worker[];
  yields: DailyYield[];
  sales: Sale[];
  onNavigate: (view: "dashboard" | "workers" | "yield" | "sales") => void;
}

export default function DashboardView({
  workers,
  yields,
  sales,
  onNavigate,
}: DashboardProps) {
  // 1. Calculations
  const activeWorkersCount = workers.filter((w) => w.active).length;

  // Total Leaf Yield Plucked (kg)
  const totalYieldKg = yields
    .reduce((acc, y) => acc + y.leavesPlucked, 0)
    .toFixed(1);

  // Total wages calculated (leaves plucked * rate or flat rates)
  const totalGrossWages = yields.reduce((acc, y) => acc + y.baseWages, 0);

  // Cash Advance Issued (taken money today)
  const totalAdvances = yields.reduce((acc, y) => acc + y.cashAdvanceAmount, 0);

  // Outstanding net wages to workers (pending status)
  const outstandingWagesPayable = yields
    .filter((y) => y.paymentStatus === "Pending")
    .reduce((acc, y) => acc + y.netPayable, 0);

  const realizedWagesPaid = yields
    .filter((y) => y.paymentStatus === "Paid")
    .reduce((acc, y) => acc + y.netPayable, 0);

  // Total Tea Sales Revenue (₹)
  const totalSalesRevenue = sales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalSalesKg = sales.reduce((acc, s) => acc + s.quantity, 0);

  // Average Sales Rate per Kg (₹)
  const avgSalesPricePerKg =
    totalSalesKg > 0 ? (totalSalesRevenue / totalSalesKg).toFixed(2) : "0.00";

  // Financial Balance (Sales Revenue - Total Gross Wages)
  const operatingProfit = totalSalesRevenue - totalGrossWages;

  // 2. Format Chart Data
  // Build Yield trends grouped by date
  const yieldByDateMap = yields.reduce(
    (acc, y) => {
      if (!acc[y.date]) acc[y.date] = 0;
      acc[y.date] += y.leavesPlucked;
      return acc;
    },
    {} as Record<string, number>,
  );

  const yieldChartData = Object.entries(yieldByDateMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, leaves]) => ({
      date: date.substring(5), // Make readable 'MM-DD'
      "Harvested Leaves (kg)": parseFloat(leaves.toFixed(1)),
    }))
    .slice(-7); // Last 7 records

  // Build financial trend (Revenue vs Expenses(Wages) by Date)
  const financesByDateMap = {} as Record<
    string,
    { revenue: number; wages: number }
  >;

  sales.forEach((s) => {
    if (!financesByDateMap[s.date])
      financesByDateMap[s.date] = { revenue: 0, wages: 0 };
    financesByDateMap[s.date].revenue += s.totalAmount;
  });

  yields.forEach((y) => {
    if (!financesByDateMap[y.date])
      financesByDateMap[y.date] = { revenue: 0, wages: 0 };
    financesByDateMap[y.date].wages += y.baseWages;
  });

  const financialChartData = Object.entries(financesByDateMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date: date.substring(5),
      "Tea Sales (₹)": Math.round(data.revenue),
      "Worker Wages (₹)": Math.round(data.wages),
    }))
    .slice(-7);

  // Top plucker leaderboard
  const pluckerMap = yields.reduce(
    (acc, y) => {
      if (y.leavesPlucked > 0) {
        if (!acc[y.workerName]) acc[y.workerName] = 0;
        acc[y.workerName] += y.leavesPlucked;
      }
      return acc;
    },
    {} as Record<string, number>,
  );

  const topPluckers = Object.entries(pluckerMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([name, kg]) => ({ name, kg: parseFloat(kg.toFixed(1)) }));

  return (
    <div className="space-y-8" id="dashboard-container">
      {/* Upper Title Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-6 border-leaf-200">
        <div>
          <h1 className="text-3xl font-display font-medium text-leaf-900 tracking-tight">
            Estate Overview & Operations
          </h1>
          <p className="text-gray-500 mt-1 font-sans">
            Real-time analytics, daily leaf plucking yields, advance cash
            tracking, and tea trade metrics.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-3 block">
          <button
            id="nav-to-yield-btn"
            onClick={() => onNavigate("yield")}
            className="px-4 py-2 border border-leaf-600 text-leaf-700 bg-transparent hover:bg-leaf-50 rounded-lg text-sm font-medium transition cursor-pointer font-sans"
          >
            Record Harvest
          </button>
        </div>
      </div>

      {/* 1. Core Financial and Yield Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Total Leaf Harvested */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs flex flex-col justify-between hover:border-leaf-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 font-sans uppercase tracking-wider">
              Leaves Harvested
            </span>
            <div className="p-2.5 rounded-lg bg-leaf-50 text-leaf-600">
              <Leaf className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <p
              className="text-2xl font-mono font-semibold text-leaf-900"
              id="yield-weight-total"
            >
              {totalYieldKg}{" "}
              <span className="text-sm font-sans font-normal text-gray-400">
                kgs
              </span>
            </p>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1 font-mono">
              From {yields.length} cumulative picker logs
            </p>
          </div>
        </div>

        {/* Card 2: Tea Sales Income */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs flex flex-col justify-between hover:border-leaf-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 font-sans uppercase tracking-wider">
              Tea Traded Revenue
            </span>
            <div className="p-2.5 rounded-lg bg-amber-50 text-harvest-800">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <p
              className="text-2xl font-mono font-semibold text-gray-900"
              id="sales-income-total"
            >
              ₹
              {totalSalesRevenue.toLocaleString("en-IN", {
                minimumFractionDigits: 0,
              })}
            </p>
            <p className="text-xs text-harvest-800 bg-harvest-50 px-2 py-0.5 rounded inline-block mt-1 font-mono">
              Avg rate: ₹{avgSalesPricePerKg}/kg
            </p>
          </div>
        </div>

        {/* Card 3: Worker Compensation Outlay */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs flex flex-col justify-between hover:border-leaf-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 font-sans uppercase tracking-wider">
              Gross Wages & Advances
            </span>
            <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-mono font-semibold text-red-950">
              ₹{totalGrossWages.toFixed(0)}
            </p>
            <div className="flex gap-2 mt-1">
              <span className="text-2xs text-rose-700 font-mono bg-rose-50 px-1.5 py-0.5 rounded">
                Paid: ₹{realizedWagesPaid.toFixed(0)}
              </span>
              <span className="text-2xs text-amber-700 font-mono bg-amber-50 px-1.5 py-0.5 rounded">
                Advances: ₹{totalAdvances.toFixed(0)}
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Operating Net Balance */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs flex flex-col justify-between hover:border-leaf-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 font-sans uppercase tracking-wider">
              Net Operating Surplus
            </span>
            <div className="p-2.5 rounded-lg bg-[#e8f5e9] text-emerald-800">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <p
              className={`text-2xl font-mono font-semibold ${operatingProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}
            >
              {operatingProfit >= 0 ? "+" : ""}₹
              {operatingProfit.toLocaleString("en-IN", {
                minimumFractionDigits: 0,
              })}
            </p>
            <p className="text-xs text-gray-400 mt-1 font-sans">
              Estate Income minus Worker wages
            </p>
          </div>
        </div>
      </div>

      {/* 2. Worker Payment Status & Outstanding Advances Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-amber-50/50 p-6 rounded-xl border border-harvest-100">
        {/* Outstanding wages summary */}
        <div className="flex gap-4">
          <div className="p-3 bg-amber-100 rounded-lg text-harvest-800 self-start">
            <CircleAlert className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-display font-medium text-harvest-800">
              Outstanding Worker Wages
            </h4>
            <p
              className="text-2xl font-mono font-semibold text-amber-950 mt-1"
              id="outstanding-wages-payout"
            >
              ₹{outstandingWagesPayable.toFixed(1)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Total base wages computed minus cash advances, waiting to be
              cleared.
            </p>
          </div>
        </div>

        {/* Taken money information */}
        <div className="flex gap-4 border-t md:border-t-0 md:border-l border-harvest-100 pt-4 md:pt-0 md:pl-6">
          <div className="p-3 bg-orange-100 rounded-lg text-orange-700 self-start">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-display font-medium text-orange-900">
              Advance Money Logged Today
            </h4>
            <p className="text-2xl font-mono font-semibold text-orange-950 mt-1">
              ₹{totalAdvances.toFixed(0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Advances given to workers for medical or daily necessities,
              deducted directly.
            </p>
          </div>
        </div>

        {/* Direct Action */}
        <div className="flex flex-col justify-center border-t md:border-t-0 md:border-l border-harvest-100 pt-4 md:pt-0 md:pl-6">
          <p className="text-xs text-gray-500 font-sans">
            Need to pay workers or cash out daily plucking yields? Update
            payment status in the Harvest Ledger.
          </p>
          <button
            onClick={() => onNavigate("yield")}
            className="mt-3 w-full sm:w-auto px-4 py-2 bg-harvest-600 hover:bg-harvest-800 text-white rounded-lg text-xs font-semibold transition tracking-wider uppercase text-center cursor-pointer"
          >
            Authorize Payouts
          </button>
        </div>
      </div>

      {/* 3. Visual Charts Trend Section (Yield & Finances) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart A: Daily Harvest Volume */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-2xs min-w-0">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-display font-medium text-gray-900">
                Leaf Harvest Volume (kg)
              </h3>
              <p className="text-xs text-gray-400">
                Trend of leaf plucking weight across the previous 7 active
                logging dates
              </p>
            </div>
            <span className="text-2xs font-mono text-leaf-700 bg-leaf-50 px-2 py-1 rounded inline-block">
              Active Seasons
            </span>
          </div>

          <div className="h-64 w-full min-w-0 relative">
            {yieldChartData.length > 0 ? (
              <div className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={100}>
                  <LineChart
                  data={yieldChartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    tickLine={false}
                    style={{ fontSize: "11px", fontFamily: "monospace" }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tickLine={false}
                    style={{ fontSize: "11px", fontFamily: "monospace" }}
                  />
                  <Tooltip
                    contentStyle={{
                      fontFamily: "sans-serif",
                      fontSize: "12px",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Harvested Leaves (kg)"
                    stroke="#2d6a4f"
                    strokeWidth={2.5}
                    activeDot={{ r: 6 }}
                    dot={{ r: 3, fill: "#2d6a4f" }}
                  />
                </LineChart>
                </ResponsiveContainer>
                </div>
                ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm font-sans italic">
                No harvesting dates logged. Record today's harvest to populate
                charts.
              </div>
            )}
          </div>
        </div>

        {/* Chart B: Income vs Labor Outlay */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-2xs min-w-0">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-display font-medium text-gray-900">
                Tea Revenue vs. Labor Outlay
              </h3>
              <p className="text-xs text-gray-400">
                Comparison of sales revenue received (₹) vs worker compensations
                (₹)
              </p>
            </div>
            <span className="text-2xs font-mono text-harvest-800 bg-harvest-50 px-2 py-1 rounded inline-block">
              Ledger Finance
            </span>
          </div>

          <div className="h-64 w-full min-w-0 relative">
            {financialChartData.length > 0 ? (
              <div className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={100}>
                  <BarChart
                  data={financialChartData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    tickLine={false}
                    style={{ fontSize: "11px", fontFamily: "monospace" }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tickLine={false}
                    style={{ fontSize: "11px", fontFamily: "monospace" }}
                  />
                  <Tooltip
                    contentStyle={{
                      fontFamily: "sans-serif",
                      fontSize: "12px",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    wrapperStyle={{ fontSize: "12px" }}
                  />
                  <Bar
                    dataKey="Tea Sales (₹)"
                    fill="#ca8a04"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="Worker Wages (₹)"
                    fill="#1b4332"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
                </ResponsiveContainer>
                </div>
                ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm font-sans italic">
                No transactions completed. Log some leaf sales to compare
                balance trends.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Directory Sync & Leaderboard Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Top Plucking pluckers (Leaderboard) */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-gray-100 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-display font-semibold text-gray-900">
                Harvest Leaderboard
              </h3>
            </div>
            <p className="text-xs text-gray-400 mb-6 font-sans">
              Most productive workers based on total cumulative kilograms
              plucked.
            </p>

            <div className="space-y-4">
              {topPluckers.length > 0 ? (
                topPluckers.map((p, index) => (
                  <div
                    key={p.name}
                    className="flex items-center justify-between border-b pb-3 border-gray-50 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                          index === 0
                            ? "bg-amber-100 text-amber-800"
                            : index === 1
                              ? "bg-slate-100 text-slate-800"
                              : "bg-orange-100 text-orange-800"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium text-gray-800">
                        {p.name}
                      </span>
                    </div>
                    <span className="text-xs font-semibold font-mono text-leaf-700 bg-leaf-50 px-2 py-1 rounded">
                      {p.kg} kgs
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-gray-400 text-sm font-sans italic text-center py-6">
                  No plucking yields recorded yet.
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigate("workers")}
            className="w-full mt-6 text-center text-xs text-leaf-700 font-semibold hover:text-leaf-900 flex items-center justify-center gap-1 cursor-pointer"
          >
            Manage Workers <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Activity Trail */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-100 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-display font-semibold text-gray-900">
              Recent Plucking Ledger Updates
            </h3>
            <span className="text-2xs text-gray-400 font-mono">
              Date Sorted
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-500 font-sans">
              <thead className="text-2xs font-mono uppercase bg-gray-50/50 text-gray-400">
                <tr>
                  <th className="px-4 py-3 rounded-l">Date</th>
                  <th className="px-4 py-3">Worker</th>
                  <th className="px-4 py-3">Activity</th>
                  <th className="px-4 py-3 text-right">Leaves Plucked</th>
                  <th className="px-4 py-3 text-right">Wages/Advance</th>
                  <th className="px-4 py-3 text-center rounded-r">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {yields
                  .slice(-4)
                  .reverse()
                  .map((y) => (
                    <tr key={y.id} className="hover:bg-gray-50/40 transition">
                      <td className="px-4 py-3 font-mono font-medium text-gray-900">
                        {y.date}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {y.workerName}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-3xs font-semibold ${
                            y.activity === "Plucking"
                              ? "bg-emerald-50 text-emerald-800"
                              : y.activity === "Pruning"
                                ? "bg-orange-50 text-orange-800"
                                : "bg-slate-50 text-gray-700"
                          }`}
                        >
                          {y.activity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-900 font-semibold">
                        {y.leavesPlucked > 0 ? `${y.leavesPlucked} kg` : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-mono text-gray-900">
                          ₹{y.baseWages.toFixed(0)}
                        </div>
                        {y.cashAdvanceTaken && (
                          <div className="text-3xs text-orange-600 font-mono">
                            Adv: -₹{y.cashAdvanceAmount.toFixed(0)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 text-3xs font-semibold px-2 py-0.5 rounded-full ${
                            y.paymentStatus === "Paid"
                              ? "bg-[#e8f5e9] text-[#1b5e20]"
                              : "bg-[#fff3e0] text-[#e65100]"
                          }`}
                        >
                          {y.paymentStatus === "Paid" ? (
                            <>
                              <CircleCheck className="w-2.5 h-2.5" /> Paid
                            </>
                          ) : (
                            <>
                              <CircleAlert className="w-2.5 h-2.5" /> Pending
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                {yields.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-6 text-gray-400 font-sans italic"
                    >
                      No estate logs exist. Set up some workers and record
                      yields to view logs here!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
