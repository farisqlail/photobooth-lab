"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import SupabaseStatus from "../../components/admin/supabase-status";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";

interface Transaction {
  id: string;
  created_at: string;
  payment_method: string;
  template_id: string;
  total_price: number;
}

interface Template {
  id: string;
  name: string;
}

type FilterType = "daily" | "monthly" | "yearly" | "overall";

export default function AdminPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter State
  const [filterType, setFilterType] = useState<FilterType>("overall");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createSupabaseBrowserClient();

        // Fetch transactions
        const { data: txData } = await supabase
          .from("transactions")
          .select("*")
          .order("created_at", { ascending: true });

        // Fetch templates
        const { data: tmplData } = await supabase
          .from("templates")
          .select("id, name");

        if (txData) setTransactions(txData);
        if (tmplData) setTemplates(tmplData);
      } catch (error) {
        console.error("Error fetching admin data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- Helpers ---

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // --- Derived Data (Filtered) ---

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const txDate = new Date(tx.created_at);
      const selDate = selectedDate;

      if (filterType === "overall") {
        return true;
      } else if (filterType === "daily") {
        return (
          txDate.getDate() === selDate.getDate() &&
          txDate.getMonth() === selDate.getMonth() &&
          txDate.getFullYear() === selDate.getFullYear()
        );
      } else if (filterType === "monthly") {
        return (
          txDate.getMonth() === selDate.getMonth() &&
          txDate.getFullYear() === selDate.getFullYear()
        );
      } else if (filterType === "yearly") {
        return txDate.getFullYear() === selDate.getFullYear();
      }
      return true;
    });
  }, [transactions, filterType, selectedDate]);

  // --- Statistics Calculation ---

  const totalTransactions = filteredTransactions.length;
  const totalRevenue = filteredTransactions.reduce(
    (sum, tx) => sum + (tx.total_price || 0),
    0
  );

  // --- Chart Data Preparation ---

  const mainChartData = useMemo(() => {
    if (filterType === "daily") {
      // Hourly breakdown (00-23)
      const data = Array.from({ length: 24 }, (_, i) => ({
        name: `${i.toString().padStart(2, "0")}:00`,
        transactions: 0,
        revenue: 0,
      }));

      filteredTransactions.forEach((tx) => {
        const hour = new Date(tx.created_at).getHours();
        data[hour].transactions += 1;
        data[hour].revenue += tx.total_price || 0;
      });
      return data;
    } else if (filterType === "monthly") {
      // Daily breakdown (1-DaysInMonth)
      const daysInMonth = getDaysInMonth(
        selectedDate.getFullYear(),
        selectedDate.getMonth()
      );
      const data = Array.from({ length: daysInMonth }, (_, i) => ({
        name: (i + 1).toString(),
        transactions: 0,
        revenue: 0,
      }));

      filteredTransactions.forEach((tx) => {
        const day = new Date(tx.created_at).getDate();
        if (data[day - 1]) {
          data[day - 1].transactions += 1;
          data[day - 1].revenue += tx.total_price || 0;
        }
      });
      return data;
    } else {
      // Monthly breakdown (Jan-Dec)
      const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
      ];
      const data = months.map((m) => ({
        name: m,
        transactions: 0,
        revenue: 0,
      }));

      filteredTransactions.forEach((tx) => {
        const month = new Date(tx.created_at).getMonth();
        data[month].transactions += 1;
        data[month].revenue += tx.total_price || 0;
      });
      return data;
    }
  }, [filteredTransactions, filterType, selectedDate]);

  // Top Templates (Filtered)
  const topTemplatesData = useMemo(() => {
    const usage: Record<string, number> = {};
    filteredTransactions.forEach((tx) => {
      if (tx.template_id) {
        usage[tx.template_id] = (usage[tx.template_id] || 0) + 1;
      }
    });

    return Object.entries(usage)
      .map(([id, count]) => {
        const tmpl = templates.find((t) => t.id === id);
        return { name: tmpl?.name || "Unknown", count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredTransactions, templates]);

  // Payment Methods (Filtered)
  const paymentData = useMemo(() => {
    const usage: Record<string, number> = {};
    filteredTransactions.forEach((tx) => {
      const method = tx.payment_method || "Unknown";
      usage[method] = (usage[method] || 0) + 1;
    });

    return Object.entries(usage)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  const COLORS = ["#8b5cf6", "#38bdf8", "#10b981", "#f59e0b", "#ef4444"];

  // --- Handlers ---

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    const date = new Date(e.target.value);
    // Adjust for timezone offset if necessary, but simple Date(value) is usually UTC 00:00 or Local
    // Input type="date" returns YYYY-MM-DD.
    // Input type="month" returns YYYY-MM.
    setSelectedDate(date);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const year = parseInt(e.target.value);
    const newDate = new Date(selectedDate);
    newDate.setFullYear(year);
    setSelectedDate(newDate);
  };

  // Generate year options (current year - 5 to current year + 1)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i);

  if (isLoading) {
    return <div className="p-8 text-center">Loading dashboard data...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Filter Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h2 className="text-xl font-bold tracking-tight">Dashboard Analytics</h2>
        <div className="flex items-center gap-2">
          <select
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as FilterType)}
          >
            <option value="overall">Semua Waktu</option>
            <option value="daily">Harian</option>
            <option value="monthly">Bulanan</option>
            <option value="yearly">Tahunan</option>
          </select>

          {filterType === "daily" && (
            <input
              type="date"
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              value={selectedDate.toISOString().split("T")[0]}
              onChange={handleDateChange}
            />
          )}

          {filterType === "monthly" && (
            <input
              type="month"
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              value={selectedDate.toISOString().slice(0, 7)}
              onChange={handleDateChange}
            />
          )}

          {filterType === "yearly" && (
            <select
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              value={selectedDate.getFullYear()}
              onChange={handleYearChange}
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex flex-col gap-2 px-5 py-4">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Total Transaksi
            </span>
            <span className="text-2xl font-semibold text-foreground">
              {totalTransactions.toLocaleString()}
            </span>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex flex-col gap-2 px-5 py-4">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Total Pemasukan
            </span>
            <span className="text-2xl font-semibold text-green-500">
              {formatCurrency(totalRevenue)}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-2 px-5 py-4">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Template Aktif
            </span>
            <span className="text-2xl font-semibold text-foreground">
              {templates.length}
            </span>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Main Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle>
                {filterType === "overall" && "Tren Transaksi Bulanan"}
                {filterType === "daily" && "Transaksi per Jam"}
                {filterType === "monthly" && "Transaksi per Hari"}
                {filterType === "yearly" && "Transaksi per Bulan"}
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mainChartData}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(148, 163, 184, 0.1)" }}
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid #1f2937",
                      borderRadius: "12px",
                      color: "#e2e8f0",
                    }}
                  />
                  <Bar dataKey="transactions" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Transaksi" />
                  {/* Optional: Add Revenue Bar or Line here if needed, but keeping it simple for now */}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Side Charts */}
        <div className="flex flex-col gap-6">
          {/* Top Templates */}
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Top Templates</CardTitle>
            </CardHeader>
            <CardContent className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={topTemplatesData}>
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={80}
                    stroke="#94a3b8"
                    fontSize={10}
                    tickFormatter={(value) => value.length > 10 ? `${value.slice(0, 10)}...` : value}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid #1f2937",
                      borderRadius: "12px",
                      color: "#e2e8f0",
                    }}
                  />
                  <Bar dataKey="count" fill="#38bdf8" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Metode Pembayaran</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                  >
                    {paymentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [value, "Jumlah"]}
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid #1f2937",
                      borderRadius: "12px",
                      color: "#e2e8f0",
                    }}
                    itemStyle={{ color: "#ffffff" }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconSize={8} fontSize={10} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <SupabaseStatus />
        </div>
      </div>
    </div>
  );
}
