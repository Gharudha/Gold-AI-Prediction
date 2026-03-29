import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Pressable,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { queryClient } from "@/lib/query-client";

interface UnifiedSignal {
  direction: "BUY" | "SELL" | "NEUTRAL";
  candleShape: "BULLISH" | "BEARISH" | "DOJI";
  confidence: number;
  score: number;
  modelAgreement: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  rrRatio: number;
  breakdown: Array<{ name: string; signal: number; weight: number; direction: string }>;
  hurstRegime: "TRENDING" | "MEAN-REVERTING" | "RANDOM";
  volatilityRegime: "HIGH" | "MEDIUM" | "LOW";
  zScore: number;
}

interface AnalysisData {
  prediction: string;
  confidence: number;
  currentPrice: number;
  confluenceScore: number;
  unifiedSignal: UnifiedSignal;
  indicators: {
    rsi: number;
    macd: { macd: number; signal: number; histogram: number };
    sma20: number;
    sma50: number;
    sma200: number;
    ema9: number;
    ema12: number;
    ema26: number;
    ema50: number;
    bollingerBands: { upper: number; middle: number; lower: number; width: number; percentB: number };
    atr: number;
    adx: number;
    stochastic: { k: number; d: number };
    williamsR: number;
    cci: number;
    mfi: number;
    vwap: number;
    ichimoku: { tenkan: number; kijun: number; senkouA: number; senkouB: number };
    trendStrength: number;
    momentum: number;
    roc: number;
  };
  patterns: Array<{
    name: string;
    type: "bullish" | "bearish" | "neutral";
    confidence: number;
    description: string;
    weight: number;
  }>;
  supportLevel: number;
  resistanceLevel: number;
}

function CandlestickVisual({ shape, color }: { shape: "BULLISH" | "BEARISH" | "DOJI"; color: string }) {
  if (shape === "BULLISH") {
    return (
      <View style={styles.candleWrapper}>
        <View style={[styles.candleWick, { backgroundColor: color, height: 16 }]} />
        <View style={[styles.candleBody, { backgroundColor: color, height: 48, borderRadius: 4 }]} />
        <View style={[styles.candleWick, { backgroundColor: color, height: 10 }]} />
      </View>
    );
  }
  if (shape === "BEARISH") {
    return (
      <View style={styles.candleWrapper}>
        <View style={[styles.candleWick, { backgroundColor: color, height: 10 }]} />
        <View style={[styles.candleBody, { backgroundColor: "transparent", height: 48, borderRadius: 4, borderWidth: 2, borderColor: color }]} />
        <View style={[styles.candleWick, { backgroundColor: color, height: 16 }]} />
      </View>
    );
  }
  return (
    <View style={styles.candleWrapper}>
      <View style={[styles.candleWick, { backgroundColor: color, height: 20 }]} />
      <View style={[styles.candleBody, { backgroundColor: color, height: 4, borderRadius: 2 }]} />
      <View style={[styles.candleWick, { backgroundColor: color, height: 20 }]} />
    </View>
  );
}

function UnifiedSignalCard({ signal, price }: { signal: UnifiedSignal; price: number }) {
  const isBuy = signal.direction === "BUY";
  const isSell = signal.direction === "SELL";
  const color = isBuy ? Colors.light.green : isSell ? Colors.light.red : Colors.light.orange;
  const bgGrad: [string, string] = isBuy
    ? ["rgba(34,197,94,0.18)", "rgba(34,197,94,0.04)"]
    : isSell
    ? ["rgba(239,68,68,0.18)", "rgba(239,68,68,0.04)"]
    : ["rgba(245,158,11,0.18)", "rgba(245,158,11,0.04)"];

  const dirLabel = isBuy ? "BULLISH" : isSell ? "BEARISH" : "SIDEWAYS";

  return (
    <LinearGradient colors={bgGrad} style={[styles.unifiedCard, { borderColor: color + "55" }]}>
      <View style={styles.unifiedHeader}>
        <View>
          <Text style={styles.unifiedTitle}>UNIFIED SIGNAL</Text>
          <Text style={styles.unifiedSub}>14 Model Ensemble · Candle Berikutnya</Text>
        </View>
        <View style={[styles.unifiedBadge, { backgroundColor: color + "22", borderColor: color }]}>
          <Text style={[styles.unifiedBadgeText, { color }]}>AI+ML+DL</Text>
        </View>
      </View>

      <View style={styles.unifiedMain}>
        <CandlestickVisual shape={signal.candleShape} color={color} />
        <View style={styles.unifiedCenter}>
          <Text style={[styles.unifiedDirection, { color }]}>{dirLabel}</Text>
          <Text style={[styles.unifiedScore, { color }]}>{signal.confidence.toFixed(1)}%</Text>
          <Text style={styles.unifiedScoreLabel}>Keyakinan Model</Text>
          <View style={styles.agreementRow}>
            <Ionicons name="checkmark-circle" size={14} color={color} />
            <Text style={[styles.agreementText, { color }]}>{signal.modelAgreement}% model setuju</Text>
          </View>
        </View>
        <View style={styles.unifiedRight}>
          <View style={[styles.regimeBadge, { backgroundColor: Colors.light.backgroundSecondary }]}>
            <Text style={styles.regimeLabel}>Regime</Text>
            <Text style={[styles.regimeValue, { color: signal.hurstRegime === "TRENDING" ? Colors.light.green : signal.hurstRegime === "MEAN-REVERTING" ? Colors.light.red : Colors.light.orange }]}>
              {signal.hurstRegime === "TRENDING" ? "TREND" : signal.hurstRegime === "MEAN-REVERTING" ? "REVERSAL" : "RANDOM"}
            </Text>
          </View>
          <View style={[styles.regimeBadge, { backgroundColor: Colors.light.backgroundSecondary, marginTop: 6 }]}>
            <Text style={styles.regimeLabel}>Volatilitas</Text>
            <Text style={[styles.regimeValue, { color: signal.volatilityRegime === "HIGH" ? Colors.light.red : signal.volatilityRegime === "MEDIUM" ? Colors.light.orange : Colors.light.green }]}>
              {signal.volatilityRegime}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.confidenceBarBg}>
        <View style={[styles.confidenceBarFill, { width: `${signal.confidence}%`, backgroundColor: color }]} />
      </View>

      {signal.direction !== "NEUTRAL" && signal.stopLoss !== 0 && (
        <View style={styles.tradeLevels}>
          <View style={styles.tradeItem}>
            <Text style={styles.tradeLabelSmall}>ENTRY</Text>
            <Text style={[styles.tradeValue, { color: Colors.light.tint }]}>${signal.entryPrice.toFixed(2)}</Text>
          </View>
          <View style={styles.tradeDivider} />
          <View style={styles.tradeItem}>
            <Text style={styles.tradeLabelSmall}>STOP LOSS</Text>
            <Text style={[styles.tradeValue, { color: Colors.light.red }]}>${signal.stopLoss.toFixed(2)}</Text>
          </View>
          <View style={styles.tradeDivider} />
          <View style={styles.tradeItem}>
            <Text style={styles.tradeLabelSmall}>TAKE PROFIT</Text>
            <Text style={[styles.tradeValue, { color: Colors.light.green }]}>${signal.takeProfit.toFixed(2)}</Text>
          </View>
          <View style={styles.tradeDivider} />
          <View style={styles.tradeItem}>
            <Text style={styles.tradeLabelSmall}>R:R</Text>
            <Text style={[styles.tradeValue, { color: Colors.light.tint }]}>1:{signal.rrRatio}</Text>
          </View>
        </View>
      )}
    </LinearGradient>
  );
}

function ModelBreakdownCard({ breakdown }: { breakdown: UnifiedSignal["breakdown"] }) {
  return (
    <View style={styles.breakdownCard}>
      <View style={styles.breakdownHeader}>
        <MaterialCommunityIcons name="chart-timeline-variant-shimmer" size={18} color={Colors.light.tint} />
        <Text style={styles.breakdownTitle}>Voting Semua Model</Text>
      </View>
      {breakdown.map((item, i) => {
        const isBuy = item.direction === "BUY";
        const isSell = item.direction === "SELL";
        const color = isBuy ? Colors.light.green : isSell ? Colors.light.red : Colors.light.orange;
        const barWidth = Math.min(100, Math.abs(item.signal));
        const barSide = item.signal >= 0 ? "right" : "left";
        return (
          <View key={i} style={styles.breakdownRow}>
            <Text style={styles.breakdownName}>{item.name}</Text>
            <View style={styles.breakdownBarContainer}>
              <View style={styles.breakdownBarCenter}>
                {item.signal < 0 && (
                  <View style={[styles.breakdownBarLeft, { width: `${barWidth}%`, backgroundColor: Colors.light.red }]} />
                )}
              </View>
              <View style={styles.breakdownBarCenter}>
                {item.signal >= 0 && (
                  <View style={[styles.breakdownBarRight, { width: `${barWidth}%`, backgroundColor: Colors.light.green }]} />
                )}
              </View>
            </View>
            <View style={[styles.dirSmallBadge, { backgroundColor: color + "22" }]}>
              <Text style={[styles.dirSmallText, { color }]}>{item.direction}</Text>
            </View>
          </View>
        );
      })}
      <View style={styles.breakdownLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.light.red }]} />
          <Text style={styles.legendText}>SELL</Text>
        </View>
        <View style={styles.centerLine} />
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.light.green }]} />
          <Text style={styles.legendText}>BUY</Text>
        </View>
      </View>
    </View>
  );
}

function PatternCard({ pattern }: { pattern: AnalysisData["patterns"][0] }) {
  const color = pattern.type === "bullish" ? Colors.light.green : pattern.type === "bearish" ? Colors.light.red : Colors.light.orange;
  const bgColor = pattern.type === "bullish" ? Colors.light.greenBg : pattern.type === "bearish" ? Colors.light.redBg : Colors.light.orangeBg;
  const icon = pattern.type === "bullish" ? "trending-up" : pattern.type === "bearish" ? "trending-down" : "swap-horizontal";
  return (
    <View style={[styles.patternCard, { borderLeftColor: color }]}>
      <View style={styles.patternHeader}>
        <View style={[styles.patternBadge, { backgroundColor: bgColor }]}>
          <Ionicons name={icon as any} size={14} color={color} />
          <Text style={[styles.patternType, { color }]}>{pattern.type.toUpperCase()}</Text>
        </View>
        <View style={styles.confidenceBadge}>
          <Text style={styles.confidenceNum}>{pattern.confidence}%</Text>
          <Text style={styles.weightText}>w{pattern.weight ?? 0}</Text>
        </View>
      </View>
      <Text style={styles.patternName}>{pattern.name}</Text>
      <Text style={styles.patternDesc}>{pattern.description}</Text>
    </View>
  );
}

function IndicatorGauge({ label, value, min, max, zones }: {
  label: string; value: number; min: number; max: number;
  zones: Array<{ from: number; to: number; color: string; label: string }>;
}) {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const currentZone = zones.find((z) => value >= z.from && value <= z.to);
  const zoneColor = currentZone?.color || Colors.light.textSecondary;
  return (
    <View style={styles.gaugeCard}>
      <View style={styles.gaugeHeader}>
        <Text style={styles.gaugeLabel}>{label}</Text>
        <Text style={[styles.gaugeValue, { color: zoneColor }]}>{value.toFixed(1)}</Text>
      </View>
      <View style={styles.gaugeBar}>
        <View style={[styles.gaugeFill, { width: `${percentage}%`, backgroundColor: zoneColor }]} />
      </View>
      <Text style={[styles.gaugeZoneLabel, { color: zoneColor }]}>{currentZone?.label || "Normal"}</Text>
    </View>
  );
}

export default function AnalysisScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const { data: analysis, isLoading, isRefetching } = useQuery<AnalysisData>({
    queryKey: ["/api/gold/analysis"],
    staleTime: 20000,
    refetchInterval: 30000,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/gold/analysis"] });
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <Text style={styles.loadingText}>Memproses 14 model...</Text>
      </View>
    );
  }

  if (!analysis) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.light.red} />
        <Text style={styles.errorText}>Gagal memuat analisis</Text>
        <Pressable style={styles.retryButton} onPress={handleRefresh}>
          <Feather name="refresh-cw" size={18} color="#fff" />
        </Pressable>
      </View>
    );
  }

  const rsiZones = [
    { from: 0, to: 30, color: Colors.light.green, label: "Oversold" },
    { from: 30, to: 70, color: Colors.light.blue, label: "Normal" },
    { from: 70, to: 100, color: Colors.light.red, label: "Overbought" },
  ];
  const stochZones = [
    { from: 0, to: 20, color: Colors.light.green, label: "Oversold" },
    { from: 20, to: 80, color: Colors.light.blue, label: "Normal" },
    { from: 80, to: 100, color: Colors.light.red, label: "Overbought" },
  ];
  const wrZones = [
    { from: -100, to: -80, color: Colors.light.green, label: "Oversold" },
    { from: -80, to: -20, color: Colors.light.blue, label: "Normal" },
    { from: -20, to: 0, color: Colors.light.red, label: "Overbought" },
  ];
  const cciZones = [
    { from: -300, to: -100, color: Colors.light.green, label: "Oversold" },
    { from: -100, to: 100, color: Colors.light.blue, label: "Normal" },
    { from: 100, to: 300, color: Colors.light.red, label: "Overbought" },
  ];
  const mfiZones = [
    { from: 0, to: 20, color: Colors.light.green, label: "Oversold" },
    { from: 20, to: 80, color: Colors.light.blue, label: "Normal" },
    { from: 80, to: 100, color: Colors.light.red, label: "Overbought" },
  ];

  const bullPatterns = analysis.patterns.filter((p) => p.type === "bullish");
  const bearPatterns = analysis.patterns.filter((p) => p.type === "bearish");
  const unified = analysis.unifiedSignal;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + webTopInset + 16, paddingBottom: 100 }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={Colors.light.tint} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Signal Analysis</Text>
        <Text style={styles.screenSubtitle}>XAUUSD · Quant + ML + DL + AI Ensemble</Text>

        {unified && (
          <>
            <UnifiedSignalCard signal={unified} price={analysis.currentPrice} />
            <ModelBreakdownCard breakdown={unified.breakdown} />
          </>
        )}

        <Text style={styles.sectionHeader}>Pola Candlestick Terdeteksi ({analysis.patterns.length})</Text>
        {analysis.patterns.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="chart-timeline-variant" size={32} color={Colors.light.textSecondary} />
            <Text style={styles.emptyText}>Tidak ada pola terdeteksi</Text>
          </View>
        ) : (
          analysis.patterns.map((pattern, i) => <PatternCard key={i} pattern={pattern} />)
        )}

        <View style={styles.patternSummary}>
          <View style={styles.patternCountRow}>
            <View style={[styles.patternCountBadge, { backgroundColor: Colors.light.greenBg }]}>
              <Ionicons name="trending-up" size={14} color={Colors.light.green} />
              <Text style={[styles.patternCountText, { color: Colors.light.green }]}>{bullPatterns.length} Bullish</Text>
            </View>
            <View style={[styles.patternCountBadge, { backgroundColor: Colors.light.redBg }]}>
              <Ionicons name="trending-down" size={14} color={Colors.light.red} />
              <Text style={[styles.patternCountText, { color: Colors.light.red }]}>{bearPatterns.length} Bearish</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionHeader}>Osilator</Text>
        <IndicatorGauge label="RSI (14)" value={analysis.indicators.rsi} min={0} max={100} zones={rsiZones} />
        <IndicatorGauge label="Stochastic %K" value={analysis.indicators.stochastic.k} min={0} max={100} zones={stochZones} />
        <IndicatorGauge label="Stochastic %D" value={analysis.indicators.stochastic.d} min={0} max={100} zones={stochZones} />
        <IndicatorGauge label="Williams %R" value={analysis.indicators.williamsR} min={-100} max={0} zones={wrZones} />
        <IndicatorGauge label="CCI (20)" value={analysis.indicators.cci} min={-300} max={300} zones={cciZones} />
        <IndicatorGauge label="MFI (14)" value={analysis.indicators.mfi} min={0} max={100} zones={mfiZones} />

        <Text style={styles.sectionHeader}>MACD</Text>
        <View style={styles.macdCard}>
          <View style={styles.macdRow}>
            <Text style={styles.macdLabel}>MACD Line</Text>
            <Text style={[styles.macdValue, { color: analysis.indicators.macd.macd >= 0 ? Colors.light.green : Colors.light.red }]}>
              {analysis.indicators.macd.macd.toFixed(3)}
            </Text>
          </View>
          <View style={styles.macdRow}>
            <Text style={styles.macdLabel}>Signal Line</Text>
            <Text style={styles.macdValue}>{analysis.indicators.macd.signal.toFixed(3)}</Text>
          </View>
          <View style={styles.macdRow}>
            <Text style={styles.macdLabel}>Histogram</Text>
            <View style={styles.histContainer}>
              <View style={[styles.histBar, {
                backgroundColor: analysis.indicators.macd.histogram >= 0 ? Colors.light.green : Colors.light.red,
                width: `${Math.min(100, Math.abs(analysis.indicators.macd.histogram) * 50)}%`,
              }]} />
              <Text style={[styles.macdValue, { color: analysis.indicators.macd.histogram >= 0 ? Colors.light.green : Colors.light.red }]}>
                {analysis.indicators.macd.histogram.toFixed(3)}
              </Text>
            </View>
          </View>
          <View style={styles.macdSignal}>
            <Ionicons
              name={analysis.indicators.macd.macd > analysis.indicators.macd.signal ? "arrow-up-circle" : "arrow-down-circle"}
              size={18}
              color={analysis.indicators.macd.macd > analysis.indicators.macd.signal ? Colors.light.green : Colors.light.red}
            />
            <Text style={[styles.macdSignalText, { color: analysis.indicators.macd.macd > analysis.indicators.macd.signal ? Colors.light.green : Colors.light.red }]}>
              {analysis.indicators.macd.macd > analysis.indicators.macd.signal ? "Bullish Crossover" : "Bearish Crossover"}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionHeader}>Kekuatan Tren (ADX)</Text>
        <View style={styles.adxCard}>
          <View style={styles.adxRow}>
            <Text style={styles.adxLabel}>ADX Value</Text>
            <Text style={[styles.adxValue, { color: analysis.indicators.adx > 25 ? Colors.light.green : Colors.light.orange }]}>
              {analysis.indicators.adx.toFixed(1)}
            </Text>
          </View>
          <View style={styles.adxBar}>
            <View style={[styles.adxFill, {
              width: `${Math.min(100, analysis.indicators.adx)}%`,
              backgroundColor: analysis.indicators.adx > 50 ? Colors.light.green : analysis.indicators.adx > 25 ? Colors.light.tint : Colors.light.orange
            }]} />
          </View>
          <Text style={styles.adxStatus}>
            {analysis.indicators.adx > 50 ? "Tren Sangat Kuat" : analysis.indicators.adx > 25 ? "Pasar Trending" : "Lemah / Ranging"}
          </Text>
        </View>

        <Text style={styles.sectionHeader}>Rangkuman Signal Matrix</Text>
        <View style={styles.summaryCard}>
          {[
            { label: "RSI", signal: analysis.indicators.rsi < 30 ? "BUY" : analysis.indicators.rsi > 70 ? "SELL" : "NEUTRAL" },
            { label: "MACD", signal: analysis.indicators.macd.histogram > 0 ? "BUY" : "SELL" },
            { label: "Stochastic", signal: analysis.indicators.stochastic.k < 20 ? "BUY" : analysis.indicators.stochastic.k > 80 ? "SELL" : "NEUTRAL" },
            { label: "Williams %R", signal: analysis.indicators.williamsR < -80 ? "BUY" : analysis.indicators.williamsR > -20 ? "SELL" : "NEUTRAL" },
            { label: "CCI", signal: analysis.indicators.cci < -100 ? "BUY" : analysis.indicators.cci > 100 ? "SELL" : "NEUTRAL" },
            { label: "MFI", signal: analysis.indicators.mfi < 20 ? "BUY" : analysis.indicators.mfi > 80 ? "SELL" : "NEUTRAL" },
            { label: "ADX Regime", signal: analysis.indicators.adx > 25 ? "TRENDING" : "RANGING" },
            { label: "EMA Cross", signal: analysis.indicators.ema9 > analysis.indicators.ema26 ? "BUY" : "SELL" },
            { label: "SMA Trend", signal: analysis.currentPrice > analysis.indicators.sma50 ? "BUY" : "SELL" },
            { label: "BB Position", signal: (analysis.indicators.bollingerBands.percentB ?? 50) < 20 ? "BUY" : (analysis.indicators.bollingerBands.percentB ?? 50) > 80 ? "SELL" : "NEUTRAL" },
            { label: "Ichimoku TK", signal: analysis.indicators.ichimoku.tenkan > analysis.indicators.ichimoku.kijun ? "BUY" : "SELL" },
            { label: "Patterns", signal: bullPatterns.length > bearPatterns.length ? "BUY" : bearPatterns.length > bullPatterns.length ? "SELL" : "NEUTRAL" },
          ].map((item, i) => (
            <View key={i} style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{item.label}</Text>
              <Text style={[styles.summarySignal, {
                color: item.signal === "BUY" ? Colors.light.green
                  : item.signal === "SELL" ? Colors.light.red
                  : item.signal === "TRENDING" ? Colors.light.green
                  : item.signal === "RANGING" ? Colors.light.orange
                  : Colors.light.textSecondary,
              }]}>
                {item.signal}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  center: { justifyContent: "center", alignItems: "center" },
  scrollContent: { paddingHorizontal: 16 },
  loadingText: { fontFamily: "Inter_500Medium", fontSize: 16, color: Colors.light.textSecondary, marginTop: 12 },
  errorText: { fontFamily: "Inter_500Medium", fontSize: 16, color: Colors.light.red, marginTop: 12 },
  retryButton: { marginTop: 16, backgroundColor: Colors.light.card, padding: 12, borderRadius: 8 },
  screenTitle: { fontFamily: "Inter_700Bold", fontSize: 28, color: Colors.light.text },
  screenSubtitle: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.light.textSecondary, marginTop: 4, marginBottom: 20 },
  sectionHeader: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.light.text, marginTop: 8, marginBottom: 12 },

  unifiedCard: {
    borderRadius: 20, padding: 20, marginBottom: 14,
    borderWidth: 1.5,
  },
  unifiedHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  unifiedTitle: { fontFamily: "Inter_700Bold", fontSize: 13, color: "#aaa", letterSpacing: 2 },
  unifiedSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: "#666", marginTop: 3 },
  unifiedBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  unifiedBadgeText: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1 },
  unifiedMain: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  unifiedCenter: { flex: 1, alignItems: "center" },
  unifiedDirection: { fontFamily: "Inter_700Bold", fontSize: 32, letterSpacing: 2 },
  unifiedScore: { fontFamily: "Inter_700Bold", fontSize: 44, lineHeight: 50 },
  unifiedScoreLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: "#777", marginTop: 2 },
  agreementRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  agreementText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  unifiedRight: { alignItems: "center", gap: 4 },
  regimeBadge: { borderRadius: 8, padding: 8, alignItems: "center", minWidth: 80 },
  regimeLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: "#888" },
  regimeValue: { fontFamily: "Inter_700Bold", fontSize: 11, marginTop: 2 },
  confidenceBarBg: { height: 6, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 3, marginBottom: 16, overflow: "hidden" },
  confidenceBarFill: { height: "100%", borderRadius: 3 },
  tradeLevels: {
    flexDirection: "row", justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 12, padding: 12,
  },
  tradeItem: { alignItems: "center", flex: 1 },
  tradeLabelSmall: { fontFamily: "Inter_400Regular", fontSize: 9, color: "#888", letterSpacing: 0.5, marginBottom: 4 },
  tradeValue: { fontFamily: "Inter_700Bold", fontSize: 12 },
  tradeDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.1)" },

  breakdownCard: {
    backgroundColor: Colors.light.card, borderRadius: 16, padding: 16,
    marginBottom: 20, borderWidth: 1, borderColor: Colors.light.cardBorder,
  },
  breakdownHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  breakdownTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.light.text },
  breakdownRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  breakdownName: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.light.textSecondary, width: 90 },
  breakdownBarContainer: { flex: 1, flexDirection: "row", height: 8, backgroundColor: Colors.light.backgroundSecondary, borderRadius: 4, overflow: "hidden" },
  breakdownBarCenter: { flex: 1, flexDirection: "row", alignItems: "center" },
  breakdownBarLeft: { height: "100%", borderRadius: 4, alignSelf: "flex-end" as const },
  breakdownBarRight: { height: "100%", borderRadius: 4 },
  dirSmallBadge: { marginLeft: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  dirSmallText: { fontFamily: "Inter_700Bold", fontSize: 10 },
  breakdownLegend: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 10, gap: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.light.textSecondary },
  centerLine: { width: 1, height: 12, backgroundColor: Colors.light.divider },

  candleWrapper: { alignItems: "center", width: 24 },
  candleWick: { width: 2, borderRadius: 1 },
  candleBody: { width: 18 },

  patternCard: { backgroundColor: Colors.light.card, borderRadius: 12, padding: 16, marginBottom: 10, borderLeftWidth: 3, borderWidth: 1, borderColor: Colors.light.cardBorder },
  patternHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  patternBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  patternType: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  confidenceBadge: { backgroundColor: Colors.light.backgroundSecondary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, flexDirection: "row", gap: 6, alignItems: "center" },
  confidenceNum: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.light.tint },
  weightText: { fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.light.textSecondary },
  patternName: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.light.text, marginBottom: 4 },
  patternDesc: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.light.textSecondary, lineHeight: 20 },
  emptyCard: { backgroundColor: Colors.light.card, borderRadius: 12, padding: 32, alignItems: "center", marginBottom: 10, borderWidth: 1, borderColor: Colors.light.cardBorder },
  emptyText: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.light.textSecondary, marginTop: 8 },
  patternSummary: { marginBottom: 16 },
  patternCountRow: { flexDirection: "row", gap: 10 },
  patternCountBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  patternCountText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  gaugeCard: { backgroundColor: Colors.light.card, borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: Colors.light.cardBorder },
  gaugeHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  gaugeLabel: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.light.textSecondary },
  gaugeValue: { fontFamily: "Inter_700Bold", fontSize: 18 },
  gaugeBar: { height: 6, backgroundColor: Colors.light.backgroundSecondary, borderRadius: 3, marginBottom: 6, overflow: "hidden" },
  gaugeFill: { height: "100%", borderRadius: 3 },
  gaugeZoneLabel: { fontFamily: "Inter_500Medium", fontSize: 12, textAlign: "right" as const },
  macdCard: { backgroundColor: Colors.light.card, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.light.cardBorder, gap: 12 },
  macdRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  macdLabel: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.light.textSecondary },
  macdValue: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.light.text },
  histContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  histBar: { height: 8, borderRadius: 4, minWidth: 4 },
  macdSignal: { flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.light.divider },
  macdSignalText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  adxCard: { backgroundColor: Colors.light.card, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.light.cardBorder },
  adxRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  adxLabel: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.light.textSecondary },
  adxValue: { fontFamily: "Inter_700Bold", fontSize: 20 },
  adxBar: { height: 6, backgroundColor: Colors.light.backgroundSecondary, borderRadius: 3, marginBottom: 8, overflow: "hidden" },
  adxFill: { height: "100%", borderRadius: 3 },
  adxStatus: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.light.textSecondary, textAlign: "center" as const },
  summaryCard: { backgroundColor: Colors.light.card, borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: Colors.light.cardBorder, gap: 14 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.light.textSecondary },
  summarySignal: { fontFamily: "Inter_700Bold", fontSize: 14 },
});
