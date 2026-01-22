"use client";

import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import SupabaseStatus from "../../components/admin/supabase-status";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

const captureData = [
  { day: "Mon", captures: 120, guests: 40 },
  { day: "Tue", captures: 180, guests: 62 },
  { day: "Wed", captures: 150, guests: 51 },
  { day: "Thu", captures: 210, guests: 70 },
  { day: "Fri", captures: 260, guests: 86 },
  { day: "Sat", captures: 320, guests: 110 },
  { day: "Sun", captures: 280, guests: 92 },
];

const engagementData = [
  { time: "10a", value: 12 },
  { time: "12p", value: 19 },
  { time: "2p", value: 24 },
  { time: "4p", value: 31 },
  { time: "6p", value: 28 },
  { time: "8p", value: 22 },
];

export default function AdminPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Active Sessions", value: "08" },
          { label: "Today Captures", value: "1,482" },
          { label: "Delivery Rate", value: "96%" },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="flex flex-col gap-2 px-5 py-4">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {item.label}
              </span>
              <span className="text-2xl font-semibold text-foreground">
                {item.value}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Weekly Captures</CardTitle>
            </CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={captureData}>
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    cursor={{ fill: "rgba(148, 163, 184, 0.1)" }}
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid #1f2937",
                      borderRadius: "12px",
                      color: "#e2e8f0",
                    }}
                  />
                  <Bar dataKey="captures" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="guests" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
        <div className="flex flex-col gap-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Engagement Trend</CardTitle>
            </CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={engagementData}>
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    cursor={{ stroke: "#475569", strokeWidth: 1 }}
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid #1f2937",
                      borderRadius: "12px",
                      color: "#e2e8f0",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#a855f7"
                    strokeWidth={3}
                    dot={{ fill: "#a855f7", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <SupabaseStatus />
        </div>
      </div>
    </div>
  );
}
