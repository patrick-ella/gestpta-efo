import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface BudgetBarData {
  name: string;
  prevu: number;
  consomme: number;
}

interface StatutDonutData {
  name: string;
  value: number;
  color: string;
}

interface Props {
  budgetData: BudgetBarData[];
  statutData: StatutDonutData[];
}

const formatFcfa = (val: number) => {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(0)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
  return val.toString();
};

const CustomTooltipBar = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="rounded border bg-card p-2 shadow text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.fill }}>
          {p.name} : {Number(p.value).toLocaleString("fr-FR")} FCFA
        </p>
      ))}
    </div>
  );
};

const CustomTooltipPie = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="rounded border bg-card p-2 shadow text-xs">
      <p className="font-semibold" style={{ color: d.payload.color }}>{d.name}</p>
      <p className="text-foreground">{d.value} sous-tâche(s)</p>
    </div>
  );
};

const DashboardCharts = ({ budgetData, statutData }: Props) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Budget Bar Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-foreground">
            Budget prévu vs consommé par activité
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={budgetData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={formatFcfa} tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltipBar />} />
              <Legend
                formatter={(val: string) => <span className="text-xs">{val}</span>}
              />
              <Bar dataKey="prevu" name="Budget prévu" fill="hsl(210, 59%, 30%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="consomme" name="Budget consommé" fill="hsl(211, 55%, 45%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Statut Donut */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-foreground">
            Répartition des sous-tâches par statut
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={statutData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                nameKey="name"
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={false}
              >
                {statutData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltipPie />} />
              <Legend formatter={(val: string) => <span className="text-xs">{val}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardCharts;
