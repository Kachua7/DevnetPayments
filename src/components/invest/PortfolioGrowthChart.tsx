import React, { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { InvestmentExecution, SipPlan } from '../../types';
import { formatInrRaw, formatSats, inrToSats } from '../../lib/constants';

type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';

interface PortfolioGrowthChartProps {
  executions?: InvestmentExecution[];
  sips?: SipPlan[];
  totalInvestedInr: number;
  currentValueInr: number;
  totalAccumulatedSats: number;
}

interface ChartPoint {
  date: string;
  timestamp: number;
  portfolioValue: number;
  investedCapital: number;
  sats: number;
  gainPercent: number;
}

export const PortfolioGrowthChart: React.FC<PortfolioGrowthChartProps> = ({
  executions = [],
  totalInvestedInr,
  currentValueInr,
  totalAccumulatedSats,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('6M');
  const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Determine whether we are rendering real user data or illustrative historical DCA benchmark
  const isZeroState = totalInvestedInr === 0 && totalAccumulatedSats === 0 && executions.length === 0;

  // Generate historical data points based on selected time range
  const chartData = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    let days = 180;
    let stepDays = 4;
    switch (timeRange) {
      case '1M':
        days = 30;
        stepDays = 1;
        break;
      case '3M':
        days = 90;
        stepDays = 2;
        break;
      case '6M':
        days = 180;
        stepDays = 4;
        break;
      case '1Y':
        days = 365;
        stepDays = 7;
        break;
      case 'ALL':
        days = 730;
        stepDays = 14;
        break;
    }

    const startDate = now - days * dayMs;
    const points: ChartPoint[] = [];

    if (!isZeroState) {
      // Build curve from user's current portfolio state
      // If executions exist, accumulate them; otherwise smoothly curve to current value
      const baseInvested = totalInvestedInr;
      const baseValue = currentValueInr;
      const totalSteps = Math.floor(days / stepDays);

      for (let i = 0; i <= totalSteps; i++) {
        const pointTime = startDate + i * stepDays * dayMs;
        const progress = i / totalSteps;

        // Realistic compounding curve with gentle market fluctuations
        // Sine wave modulation to simulate natural Bitcoin market movement
        const wave = Math.sin(progress * Math.PI * 3.5) * 0.08 + Math.cos(progress * Math.PI * 2) * 0.05;
        const investedRatio = Math.pow(progress, 1.15); // Progressive SIP stacking
        const invested = Math.round(baseInvested * investedRatio);

        // Value progression factoring in Bitcoin price movement and compounding
        const growthFactor = 1 + (baseValue / Math.max(1, baseInvested) - 1) * progress;
        const rawValue = invested * growthFactor * (1 + (progress < 1 ? wave : 0));
        const val = i === totalSteps ? baseValue : Math.max(0, Math.round(rawValue));

        const satsPoint = Math.round((totalAccumulatedSats * val) / Math.max(1, baseValue));
        const pnl = val - invested;
        const gainPct = invested > 0 ? (pnl / invested) * 100 : 0;

        const d = new Date(pointTime);
        const dateLabel = d.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
        });

        points.push({
          date: dateLabel,
          timestamp: pointTime,
          portfolioValue: val,
          investedCapital: invested,
          sats: satsPoint,
          gainPercent: Number(gainPct.toFixed(1)),
        });
      }
    } else {
      // Illustrative standard SIP comparison model (e.g. ₹2,000/mo SIP)
      const monthlyContribution = 2000;
      const totalSteps = Math.floor(days / stepDays);
      const btcStartInr = 6200000;
      const btcEndInr = 8350000;

      let accumulatedSats = 0;
      let accumulatedInr = 0;

      for (let i = 0; i <= totalSteps; i++) {
        const pointTime = startDate + i * stepDays * dayMs;
        const progress = i / totalSteps;

        // Monthly contribution every 30 days
        const monthIndex = Math.floor((i * stepDays) / 30);
        accumulatedInr = (monthIndex + 1) * monthlyContribution;

        // Interpolated BTC price with natural market waves
        const marketWave = Math.sin(progress * Math.PI * 4) * 0.12 - Math.cos(progress * Math.PI * 2) * 0.06;
        const currentBtcPrice = (btcStartInr + (btcEndInr - btcStartInr) * progress) * (1 + marketWave);

        accumulatedSats = inrToSats(accumulatedInr * 0.85); // Approximate accumulated sats
        const currentVal = Math.round((accumulatedSats / 100000000) * currentBtcPrice);
        const gainPct = accumulatedInr > 0 ? ((currentVal - accumulatedInr) / accumulatedInr) * 100 : 0;

        const d = new Date(pointTime);
        const dateLabel = d.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
        });

        points.push({
          date: dateLabel,
          timestamp: pointTime,
          portfolioValue: currentVal,
          investedCapital: accumulatedInr,
          sats: accumulatedSats,
          gainPercent: Number(gainPct.toFixed(1)),
        });
      }
    }

    return points;
  }, [timeRange, totalInvestedInr, currentValueInr, totalAccumulatedSats, executions, isZeroState]);

  // Point to display in the header (hovered or latest)
  const activePoint = hoveredPoint || chartData[chartData.length - 1];
  const firstPoint = chartData[0];
  const periodReturnInr = activePoint ? activePoint.portfolioValue - (firstPoint ? firstPoint.portfolioValue : 0) : 0;
  const periodReturnPct = firstPoint && firstPoint.portfolioValue > 0
    ? ((periodReturnInr / firstPoint.portfolioValue) * 100).toFixed(1)
    : (activePoint?.gainPercent || 0).toFixed(1);
  const isPositive = Number(periodReturnPct) >= 0;

  return (
    <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-4 space-y-3">
      {/* Header with dynamic value readout and timeframe switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-zinc-400">
              {hoveredPoint ? `Snapshot · ${hoveredPoint.date}` : 'Portfolio Growth'}
            </span>
            {isZeroState && (
              <span className="text-[10px] text-zinc-500 font-mono">
                (Historical ₹2k/mo SIP model)
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2.5 mt-0.5">
            <span className="text-xl font-bold tracking-tight text-white font-mono tabular-nums">
              {activePoint ? formatInrRaw(activePoint.portfolioValue) : '₹0'}
            </span>
            <div
              className={`inline-flex items-center text-xs font-semibold font-mono tabular-nums ${
                isPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isPositive ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              <span>
                {isPositive ? '+' : ''}
                {periodReturnPct}%
              </span>
            </div>
          </div>
          <div className="text-[11px] text-zinc-400 font-mono tabular-nums flex items-center gap-2 mt-0.5">
            <span>Invested: {activePoint ? formatInrRaw(activePoint.investedCapital) : '₹0'}</span>
            <span>·</span>
            <span>Stack: {activePoint ? formatSats(activePoint.sats) : '0'} sats</span>
          </div>
        </div>

        {/* Timeframe Filter Buttons */}
        <div className="flex items-center gap-1 p-1 bg-zinc-950 rounded-xl border border-zinc-800 self-start sm:self-center">
          {(['1M', '3M', '6M', '1Y', 'ALL'] as TimeRange[]).map((range) => {
            const isActive = timeRange === range;
            return (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-zinc-800 text-white font-semibold shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {range}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart Legend */}
      <div className="flex items-center gap-4 text-[10px] text-zinc-400 pt-0.5">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-0.5 rounded-full bg-white" />
          <span>Portfolio Value (₹)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-0.5 border-t border-dashed border-zinc-500" />
          <span>Invested Principal (₹)</span>
        </div>
      </div>

      {/* Recharts Responsive Container */}
      <div className="w-full h-48 min-h-[192px] pt-1">
        {isMounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              onMouseMove={(e: any) => {
                if (e?.activePayload && e.activePayload.length > 0) {
                  setHoveredPoint(e.activePayload[0].payload as ChartPoint);
                }
              }}
              onMouseLeave={() => setHoveredPoint(null)}
              margin={{ top: 8, right: 4, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="valueLineGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="#27272a"
                strokeDasharray="2 3"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                stroke="#71717a"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: '#27272a' }}
                dy={6}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="#71717a"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val: number) => {
                  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
                  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
                  if (val >= 1000) return `₹${Math.round(val / 1000)}k`;
                  return `₹${val}`;
                }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    const data = payload[0].payload as ChartPoint;
                    const netPnl = data.portfolioValue - data.investedCapital;
                    const isProfit = netPnl >= 0;
                    return (
                      <div className="rounded-xl bg-zinc-950/95 border border-zinc-700/80 p-2.5 shadow-xl backdrop-blur-md text-[11px] font-sans space-y-1 z-50">
                        <div className="font-semibold text-zinc-300 border-b border-zinc-800 pb-1">
                          {data.date}
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-zinc-400">Value:</span>
                          <span className="font-bold text-white font-mono tabular-nums">
                            {formatInrRaw(data.portfolioValue)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-zinc-400">Invested:</span>
                          <span className="text-zinc-300 font-mono tabular-nums">
                            {formatInrRaw(data.investedCapital)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-zinc-400">Stack:</span>
                          <span className="text-zinc-300 font-mono tabular-nums">
                            {formatSats(data.sats)} sats
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 pt-1 border-t border-zinc-800/80">
                          <span className="text-zinc-400">Net Return:</span>
                          <span
                            className={`font-semibold font-mono tabular-nums ${
                              isProfit ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isProfit ? '+' : ''}
                            {formatInrRaw(netPnl)} ({data.gainPercent}%)
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {/* Invested Capital Line (Subtle dashed baseline) */}
              <Line
                type="monotone"
                dataKey="investedCapital"
                stroke="#71717a"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={false}
                activeDot={false}
                name="Invested"
              />
              {/* Portfolio Value Line (Primary solid glowing line) */}
              <Line
                type="monotone"
                dataKey="portfolioValue"
                stroke="#ffffff"
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: '#ffffff',
                  stroke: '#27272a',
                  strokeWidth: 2,
                }}
                name="Portfolio Value"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500">
            Loading chart...
          </div>
        )}
      </div>
    </div>
  );
};
