import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO, subMonths } from "date-fns";
import { formatDose } from "@/utils/doseUtils";
import { Star } from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type MetricType = "weight" | "energy" | "sleep" | "cravings";
type TimeFrame = "1M" | "3M" | "6M" | "1Y" | "All";

interface DosageChange {
  date: Date;
  amount: number;
  unit: string;
}

interface MetricChartProps {
  metricType: MetricType;
  entries: any[];
  timeFrame: TimeFrame;
  isLoading: boolean;
  dosageChanges?: DosageChange[];
  selectedMedication?: string;
  onDotClick?: (index: number) => void;
  weightUnit?: string;
}

export const MetricChart = ({
  metricType,
  entries,
  timeFrame,
  isLoading,
  dosageChanges = [],
  selectedMedication,
  onDotClick,
  weightUnit = 'lbs'
}: MetricChartProps) => {
  const cutoffDate = useMemo(() => {
    const now = new Date();
    switch (timeFrame) {
      case '1M': return subMonths(now, 1);
      case '3M': return subMonths(now, 3);
      case '6M': return subMonths(now, 6);
      case '1Y': return subMonths(now, 12);
      case 'All': return new Date(0);
      default: return subMonths(now, 12);
    }
  }, [timeFrame]);

  // Convert weight for display based on unit preference
  const convertWeight = (weightLbs: number) => {
    if (weightUnit === 'kg') {
      return Math.round((weightLbs / 2.20462) * 10) / 10;
    }
    return Math.round(weightLbs * 10) / 10;
  };

  const chartData = useMemo(() => {
    let filteredEntries = entries.filter(e => {
      const entryDate = parseISO(e.entry_date);
      if (entryDate < cutoffDate) return false;
      
      if (metricType === "weight") return e.metrics?.weight;
      if (metricType === "energy") return e.metrics?.energy;
      if (metricType === "sleep") return e.metrics?.sleep;
      if (metricType === "cravings") return e.metrics?.cravings;
      return false;
    });

    const sortedEntries = filteredEntries.sort((a, b) => 
      a.entry_date.localeCompare(b.entry_date)
    );

    // Track assigned dosage changes
    const assignedChanges = new Set<number>();

    return sortedEntries.map(entry => {
      const entryDate = parseISO(entry.entry_date);
      const dateStr = format(entryDate, 'MMM d');
      
      let dosageLabel: string | undefined;
      if (dosageChanges.length > 0) {
        for (let i = 0; i < dosageChanges.length; i++) {
          if (assignedChanges.has(i)) continue;
          const change = dosageChanges[i];
          if (change.date <= entryDate) {
            dosageLabel = formatDose(change.amount, change.unit);
            assignedChanges.add(i);
            break;
          }
        }
      }

      const getValue = () => {
        if (metricType === "weight") return convertWeight(entry.metrics.weight);
        if (metricType === "energy") return entry.metrics.energy;
        if (metricType === "sleep") return entry.metrics.sleep;
        if (metricType === "cravings") return entry.metrics.cravings;
        return 0;
      };

      return {
        date: dateStr,
        value: getValue(),
        fullDate: entry.entry_date,
        dosageLabel,
        id: entry.id
      };
    });
  }, [entries, cutoffDate, metricType, dosageChanges, weightUnit]);

  // Custom dot with dosage labels for line chart
  const CustomDot = (props: any) => {
    const { cx, cy, payload, index, color } = props;
    if (!cx || !cy) return null;
    
    const dotColor = color || "hsl(var(--primary))";
    const badgeWidth = payload?.dosageLabel ? Math.max(45, payload.dosageLabel.length * 7 + 16) : 0;
    const isLastPoint = index === chartData.length - 1;
    const isFirstPoint = index === 0;
    
    let badgeX = cx - badgeWidth / 2;
    if (isLastPoint && payload?.dosageLabel) {
      badgeX = cx - badgeWidth + 10;
    } else if (isFirstPoint && payload?.dosageLabel) {
      badgeX = cx - 10;
    }
    
    return (
      <g>
        <circle
          cx={cx}
          cy={cy}
          r={5}
          fill={dotColor}
          stroke="none"
          cursor={onDotClick ? "pointer" : "default"}
          onClick={() => onDotClick?.(index)}
        />
        {payload?.dosageLabel && (
          <g>
            <rect
              x={badgeX}
              y={cy - 28}
              width={badgeWidth}
              height={18}
              rx={4}
              fill={dotColor}
            />
            <text
              x={badgeX + badgeWidth / 2}
              y={cy - 16}
              textAnchor="middle"
              fill="white"
              fontSize={10}
              fontWeight={600}
            >
              {payload.dosageLabel}
            </text>
          </g>
        )}
      </g>
    );
  };

  const CustomActiveDot = (props: any) => {
    const { cx, cy, index, color } = props;
    if (!cx || !cy) return null;
    
    const dotColor = color || "hsl(var(--primary))";
    
    return (
      <circle
        cx={cx}
        cy={cy}
        r={7}
        fill={dotColor}
        stroke="hsl(var(--background))"
        strokeWidth={2}
        cursor={onDotClick ? "pointer" : "default"}
        onClick={() => onDotClick?.(index)}
      />
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null;
    const data = payload[0].payload;
    
    return (
      <div className="p-3 shadow-lg border border-border bg-card rounded-lg">
        <p className="text-xs font-medium text-muted-foreground mb-1">{data.date}</p>
        {metricType === "weight" && (
          <p className="text-sm font-semibold text-foreground">{data.value} {weightUnit}</p>
        )}
        {(metricType === "energy" || metricType === "sleep" || metricType === "cravings") && (
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map(star => (
              <Star
                key={star}
                className={`w-3 h-3 ${star <= data.value ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`}
              />
            ))}
          </div>
        )}
        {data.dosageLabel && (
          <p className="text-xs text-primary mt-1">Dosage: {data.dosageLabel}</p>
        )}
      </div>
    );
  };


  const getYAxisConfig = () => {
    if (metricType === "weight") {
      return {
        domain: ['dataMin - 5', 'dataMax + 5'] as [string, string],
        label: `Weight (${weightUnit})`
      };
    }
    return {
      domain: [0, 5] as [number, number],
      label: metricType === "energy" ? 'Energy' : metricType === "cravings" ? 'Cravings' : 'Sleep Quality',
      ticks: [1, 2, 3, 4, 5]
    };
  };

  const yAxisConfig = getYAxisConfig();

  if (isLoading) {
    return <Skeleton className="w-full h-[200px]" />;
  }

  if (chartData.length === 0) {
    const labels = {
      weight: "No weight data yet. Start logging to see your progress!",
      energy: "No energy data yet. Start tracking to see patterns!",
      sleep: "No sleep data yet. Start tracking to see patterns!",
      cravings: "No cravings data yet. Start tracking to see patterns!",
      notes: ""
    };
    
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
        {labels[metricType]}
      </div>
    );
  }

  // Get color based on metric type - all coral for cohesive design
  const getMetricColor = () => {
    // All metrics use primary (coral) for a cohesive single-color system
    return { stroke: "hsl(var(--primary))", fill: "hsl(var(--primary))" };
  };

  const metricColor = getMetricColor();

  // Use area chart (filled underneath) for energy, sleep, and cravings
  // Like the medication levels visualization
  if (metricType === "energy" || metricType === "sleep" || metricType === "cravings") {
    return (
      <ResponsiveContainer width="100%" height={dosageChanges.length > 0 ? 250 : 200}>
        <AreaChart data={chartData} margin={{ top: dosageChanges.length > 0 ? 35 : 10, right: 20, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id={`${metricType}Gradient`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={metricColor.fill} stopOpacity={0.4}/>
              <stop offset="95%" stopColor={metricColor.fill} stopOpacity={0.05}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis 
            dataKey="date" 
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            domain={[0, 5]}
            ticks={[1, 2, 3, 4, 5]}
            label={{ 
              value: yAxisConfig.label, 
              angle: -90, 
              position: 'insideLeft',
              style: { fill: 'hsl(var(--muted-foreground))', fontSize: 11 }
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke={metricColor.stroke}
            strokeWidth={2}
            fill={`url(#${metricType}Gradient)`}
            dot={(props: any) => <CustomDot {...props} color={metricColor.stroke} />}
            activeDot={(props: any) => <CustomActiveDot {...props} color={metricColor.stroke} />}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  // Line chart for weight
  return (
    <ResponsiveContainer width="100%" height={dosageChanges.length > 0 ? 250 : 200}>
      <LineChart data={chartData} margin={{ top: dosageChanges.length > 0 ? 35 : 10, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
        <XAxis 
          dataKey="date" 
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis 
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          domain={yAxisConfig.domain}
          label={{ 
            value: yAxisConfig.label, 
            angle: -90, 
            position: 'insideLeft',
            style: { fill: 'hsl(var(--muted-foreground))', fontSize: 11 }
          }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line 
          type="monotone" 
          dataKey="value" 
          stroke="hsl(var(--primary))" 
          strokeWidth={3}
          dot={<CustomDot />}
          activeDot={<CustomActiveDot />}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
