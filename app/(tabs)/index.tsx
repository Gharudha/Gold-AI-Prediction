import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Pressable,
  AppState,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { queryClient } from "@/lib/query-client";

interface TimeframeSignal {
  timeframe: string;
  trend: "UP" | "DOWN" | "SIDEWAYS";
  strength: number;
  rsi: number;
  macdHistogram: number;
  priceVsSma20: number;
}

interface EarlyWarning {
  signal: "BUY" | "SELL" | "NEUTRAL";
  urgency: "HIGH" | "MEDIUM" | "LOW";
  message: string;
  secondsUntilClose: number;
}

interface AnalysisData {
  prediction: "BUY" | "SELL" | "NEUTRAL";
  confidence: number;
  currentPrice: number;
  isMarketOpen: boolean;
  predictedDirection: "UP" | "DOWN" | "SIDEWAYS";
  riskNote?: string;
  riskManagement?: {
    stopLoss: number;
    takeProfit: number;
  };
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
    pivotPoints: { pivot: number; r1: number; r2: number; r3: number; s1: number; s2: number; s3: number };
  };
  patterns: Array<{
    name: string;
    type: "bullish" | "bearish" | "neutral";
    confidence: number;
    description: string;
    weight: number;
  }>;
  reasoning: string;
  timeframe: string;
  supportLevel: number;
  resistanceLevel: number;
  nextCandlePrediction: {
    expectedOpen: number;
    expectedHigh: number;
    expectedLow: number;
    expectedClose: number;
  };
  timeframeSignals: TimeframeSignal[];
  confluenceScore: number;
  earlyWarning: EarlyWarning;
  lastUpdated: number;
}

const AUTO_REFRESH_INTERVAL = 30;

function SignalBadge({ prediction, confidence }: { prediction: string; confidence: number }) {
  const color = prediction === "BUY" ? Colors.light.green : prediction === "SELL" ? Colors.light.red : Colors.light.orange;
  const bgColor = prediction === "BUY" ? Colors.light.greenBg : prediction === "SELL" ? Colors.light.redBg : Colors.light.orangeBg;
  const icon = prediction === "BUY" ? "arrow-up-circle" : prediction === "SELL" ? "arrow-down-circle" : "remove-circle";

  return (
    <View style={[styles.signalBadge, { backgroundColor: bgColor, borderColor: color }]}>
      <Ionicons name={icon as any} size={28} color={color} />
      <Text style={[styles.signalText, { color }]}>{prediction}</Text>
      <Text style={[styles.confidenceText, { color }]}>{confidence.toFixed(1)}%</Text>
    </View>
  );
}

function IndicatorCard({ title, value, subtitle, color }: { title: string; value: string; subtitle?: string; color?: string }) {
  return (
    <View style={styles.indicatorCard}>
      <Text style={styles.indicatorTitle}>{title}</Text>
      <Text style={[styles.indicatorValue, color ? { color } : {}]}>{value}</Text>
      {subtitle && <Text style={styles.indicatorSubtitle}>{subtitle}</Text>}
    </View>
  );
}

function EarlyWarningCard({ warning }: { warning: EarlyWarning }) {
  const urgencyColors = {
    HIGH: Colors.light.red,
    MEDIUM: Colors.light.orange,
    LOW: Colors.light.blue,
  };
  const urgencyBg = {
    HIGH: "rgba(239, 68, 68, 0.15)",
    MEDIUM: "rgba(245, 158, 11, 0.15)",
    LOW: "rgba(59, 130, 246, 0.08)",
  };
  const color = urgencyColors[warning.urgency];
  const bg = urgencyBg[warning.urgency];

  const minutes = Math.floor(warning.secondsUntilClose / 60);
  const seconds = warning.secondsUntilClose % 60;

  return (
    <View style={[styles.warningCard, { borderColor: color, backgroundColor: bg }]}>
      <View style={styles.warningHeader}>
        <View style={styles.warningLeft}>
          <Ionicons name={warning.urgency === "HIGH" ? "warning" : "time"} size={20} color={color} />
          <Text style={[styles.warningTitle, { color }]}>
            {warning.urgency} PRIORITY
          </Text>
        </View>
        <View style={[styles.countdownBadge, { borderColor: color }]}>
          <Text style={[styles.countdownText, { color }]}>
            {minutes}:{seconds.toString().padStart(2, "0")}
          </Text>
        </View>
      </View>
      <Text style={styles.warningMessage}>{warning.message}</Text>
    </View>
  );
}

function TimeframeRow({ signal }: { signal: TimeframeSignal }) {
  const color = signal.trend === "UP" ? Colors.light.green : signal.trend === "DOWN" ? Colors.light.red : Colors.light.orange;
  const icon = signal.trend === "UP" ? "trending-up" : signal.trend === "DOWN" ? "trending-down" : "swap-horizontal";

  return (
    <View style={styles.tfRow}>
      <View style={styles.tfLeft}>
        <Text style={styles.tfLabel}>{signal.timeframe}</Text>
      </View>
      <View style={[styles.tfBadge, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon as any} size={14} color={color} />
        <Text style={[styles.tfTrend, { color }]}>{signal.trend}</Text>
      </View>
      <Text style={styles.tfStrength}>{signal.strength}%</Text>
      <Text style={[styles.tfRsi, { color: signal.rsi < 30 ? Colors.light.green : signal.rsi > 70 ? Colors.light.red : Colors.light.textSecondary }]}>
        {signal.rsi.toFixed(0)}
      </Text>
    </View>
  );
}

function ConfluenceMeter({ score, direction }: { score: number; direction: string }) {
  const color = direction === "BUY" ? Colors.light.green : direction === "SELL" ? Colors.light.red : Colors.light.orange;
  return (
    <View style={styles.confluenceCard}>
      <View style={styles.confluenceHeader}>
        <MaterialCommunityIcons name="chart-arc" size={18} color={Colors.light.tint} />
        <Text style={styles.confluenceLabel}>Confluence Score</Text>
      </View>
      <View style={styles.confluenceBarBg}>
        <View style={[styles.confluenceBarFill, { width: `${Math.min(100, score)}%`, backgroundColor: color }]} />
      </View>
      <View style={styles.confluenceRow}>
        <Text style={[styles.confluenceScore, { color }]}>{score.toFixed(1)}%</Text>
        <Text style={[styles.confluenceDir, { color }]}>{direction}</Text>
      </View>
    </View>
  );
}

function PredictionCard({ prediction }: { prediction: AnalysisData["nextCandlePrediction"] }) {
  return (
    <View style={styles.predictionCard}>
      <View style={styles.predictionHeader}>
        <MaterialCommunityIcons name="crystal-ball" size={20} color={Colors.light.tint} />
        <Text style={styles.sectionTitle}>Next M5 Candle Prediction</Text>
      </View>
      <View style={styles.predictionGrid}>
        <View style={styles.predictionItem}>
          <Text style={styles.predictionLabel}>Open</Text>
          <Text style={styles.predictionValue}>${prediction.expectedOpen.toFixed(2)}</Text>
        </View>
        <View style={styles.predictionItem}>
          <Text style={styles.predictionLabel}>High</Text>
          <Text style={[styles.predictionValue, { color: Colors.light.green }]}>${prediction.expectedHigh.toFixed(2)}</Text>
        </View>
        <View style={styles.predictionItem}>
          <Text style={styles.predictionLabel}>Low</Text>
          <Text style={[styles.predictionValue, { color: Colors.light.red }]}>${prediction.expectedLow.toFixed(2)}</Text>
        </View>
        <View style={styles.predictionItem}>
          <Text style={styles.predictionLabel}>Close</Text>
          <Text style={[styles.predictionValue, { color: Colors.light.tint }]}>${prediction.expectedClose.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const [countdown, setCountdown] = useState(AUTO_REFRESH_INTERVAL);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    data: analysis,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<AnalysisData>({
    queryKey: ["/api/gold/analysis"],
    staleTime: 20000,
    refetchInterval: isMonitoring ? AUTO_REFRESH_INTERVAL * 1000 : false,
  });

  useEffect(() => {
    if (!isMonitoring) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    setCountdown(AUTO_REFRESH_INTERVAL);
    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return AUTO_REFRESH_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isMonitoring, isRefetching]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && isMonitoring) {
        queryClient.invalidateQueries({ queryKey: ["/api/gold/analysis"] });
        setCountdown(AUTO_REFRESH_INTERVAL);
      }
    });
    return () => subscription.remove();
  }, [isMonitoring]);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/gold/analysis"] });
    setCountdown(AUTO_REFRESH_INTERVAL);
  }, []);

  const toggleMonitoring = useCallback(() => {
    setIsMonitoring((prev) => !prev);
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <Text style={styles.loadingText}>Analyzing Gold Markets...</Text>
        <Text style={styles.loadingSubtext}>Processing multi-timeframe data</Text>
      </View>
    );
  }

  if (!analysis) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.light.red} />
        <Text style={styles.errorText}>Failed to load analysis</Text>
        <Pressable style={styles.retryButton} onPress={handleRefresh}>
          <Feather name="refresh-cw" size={18} color="#fff" />
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const rsiColor = analysis.indicators.rsi > 70 ? Colors.light.red : analysis.indicators.rsi < 30 ? Colors.light.green : Colors.light.text;
  const priceChange = analysis.currentPrice - analysis.nextCandlePrediction.expectedOpen;
  const priceChangePercent = ((priceChange / analysis.nextCandlePrediction.expectedOpen) * 100).toFixed(3);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + webTopInset + 10, paddingBottom: 100 }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={Colors.light.tint} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statusBar}>
          <View style={styles.marketStatusRow}>
            <View style={[styles.liveDot, { backgroundColor: analysis.isMarketOpen ? Colors.light.green : Colors.light.red }]} />
            <Text style={[styles.monitorText, { color: analysis.isMarketOpen ? Colors.light.green : Colors.light.red, fontWeight: '700' }]}>
              MARKET {analysis.isMarketOpen ? "OPEN" : "CLOSED"}
            </Text>
          </View>
          <Pressable onPress={toggleMonitoring} style={[styles.monitorBtn, isMonitoring ? styles.monitorBtnActive : null]}>
            <Text style={[styles.monitorText, { color: isMonitoring ? Colors.light.green : Colors.light.red }]}>
              {isMonitoring ? "MONITORING" : "PAUSED"}
            </Text>
          </Pressable>
          <View style={styles.refreshInfo}>
            {isRefetching && <ActivityIndicator size="small" color={Colors.light.tint} />}
            <Text style={styles.refreshText}>
              {isRefetching ? "Updating..." : `Refresh: ${countdown}s`}
            </Text>
          </View>
        </View>

        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>XAUUSD</Text>
            <Text style={styles.headerSubtitle}>Gold / US Dollar</Text>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.priceText}>${analysis.currentPrice.toFixed(2)}</Text>
            <View style={styles.priceChangeRow}>
              <Ionicons
                name={priceChange >= 0 ? "caret-up" : "caret-down"}
                size={14}
                color={priceChange >= 0 ? Colors.light.green : Colors.light.red}
              />
              <Text style={[styles.priceChange, { color: priceChange >= 0 ? Colors.light.green : Colors.light.red }]}>
                {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)} ({priceChangePercent}%)
              </Text>
            </View>
          </View>
        </View>

        {analysis.earlyWarning && (
          <EarlyWarningCard warning={analysis.earlyWarning} />
        )}

        {analysis.riskNote ? (
          <View style={[styles.warningCard, { borderColor: Colors.light.orange, backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
             <Text style={[styles.warningMessage, { color: Colors.light.orange, fontWeight: '700' }]}>{analysis.riskNote}</Text>
          </View>
        ) : null}

        <LinearGradient
          colors={
            analysis.prediction === "BUY"
              ? ["rgba(34, 197, 94, 0.25)", "rgba(34, 197, 94, 0.05)"]
              : analysis.prediction === "SELL"
              ? ["rgba(239, 68, 68, 0.25)", "rgba(239, 68, 68, 0.05)"]
              : ["rgba(245, 158, 11, 0.25)", "rgba(245, 158, 11, 0.05)"]
          }
          style={[styles.signalSection, { borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }]}
        >
          <View style={{ position: 'absolute', top: -10, right: 10, backgroundColor: Colors.light.tint, paddingHorizontal: 8, borderRadius: 10 }}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>PRO MODEL v5.2</Text>
          </View>
          <Text style={styles.signalLabel}>INSTITUTIONAL SIGNAL</Text>
          <SignalBadge prediction={analysis.prediction} confidence={analysis.confidence} />
          <View style={styles.directionRow}>
            <Ionicons
              name={analysis.predictedDirection === "UP" ? "trending-up" : analysis.predictedDirection === "DOWN" ? "trending-down" : "swap-horizontal"}
              size={20}
              color={analysis.predictedDirection === "UP" ? Colors.light.green : analysis.predictedDirection === "DOWN" ? Colors.light.red : Colors.light.orange}
            />
            <Text style={styles.directionText}>Next Candle: {analysis.predictedDirection}</Text>
          </View>
        </LinearGradient>

        <ConfluenceMeter score={analysis.confluenceScore} direction={analysis.prediction} />

        <View style={styles.reasoningCard}>
          <View style={styles.reasoningHeader}>
            <MaterialCommunityIcons name="robot" size={18} color={Colors.light.tint} />
            <Text style={styles.reasoningLabel}>AI Analysis</Text>
          </View>
          <Text style={styles.reasoningText}>{analysis.reasoning}</Text>
        </View>

        <PredictionCard prediction={analysis.nextCandlePrediction} />

        {analysis.prediction !== "NEUTRAL" && analysis.riskManagement && (
          <View style={styles.riskCard}>
            <View style={styles.riskHeader}>
              <MaterialCommunityIcons name="shield-check" size={20} color={Colors.light.tint} />
              <Text style={styles.sectionTitle}>Risk Management (Real Market)</Text>
            </View>
            <View style={styles.riskGrid}>
              <View style={[styles.riskItem, { borderLeftColor: Colors.light.red, borderLeftWidth: 4 }]}>
                <Text style={styles.riskLabel}>STOP LOSS</Text>
                <Text style={[styles.riskValue, { color: Colors.light.red }]}>${analysis.riskManagement.stopLoss.toFixed(2)}</Text>
              </View>
              <View style={[styles.riskItem, { borderLeftColor: Colors.light.green, borderLeftWidth: 4 }]}>
                <Text style={styles.riskLabel}>TAKE PROFIT</Text>
                <Text style={[styles.riskValue, { color: Colors.light.green }]}>${analysis.riskManagement.takeProfit.toFixed(2)}</Text>
              </View>
            </View>
            <Text style={styles.riskHint}>*Calculated based on 1.5x / 3x ATR volatility</Text>
          </View>
        )}

        <Text style={styles.sectionHeader}>Multi-Timeframe Signals</Text>
        <View style={styles.tfCard}>
          <View style={styles.tfHeaderRow}>
            <Text style={[styles.tfColLabel, { flex: 1 }]}>TF</Text>
            <Text style={[styles.tfColLabel, { flex: 1.5 }]}>Trend</Text>
            <Text style={[styles.tfColLabel, { width: 40, textAlign: "center" as const }]}>Str</Text>
            <Text style={[styles.tfColLabel, { width: 40, textAlign: "center" as const }]}>RSI</Text>
          </View>
          {analysis.timeframeSignals?.map((signal, i) => (
            <TimeframeRow key={i} signal={signal} />
          ))}
        </View>

        <Text style={styles.sectionHeader}>Key Indicators</Text>
        <View style={styles.indicatorGrid}>
          <IndicatorCard title="RSI (14)" value={analysis.indicators.rsi.toFixed(1)}
            subtitle={analysis.indicators.rsi > 70 ? "Overbought" : analysis.indicators.rsi < 30 ? "Oversold" : "Normal"} color={rsiColor} />
          <IndicatorCard title="MACD" value={analysis.indicators.macd.macd.toFixed(2)}
            subtitle={`Hist: ${analysis.indicators.macd.histogram.toFixed(3)}`}
            color={analysis.indicators.macd.histogram > 0 ? Colors.light.green : Colors.light.red} />
          <IndicatorCard title="Stoch %K" value={analysis.indicators.stochastic.k.toFixed(1)}
            subtitle={`%D: ${analysis.indicators.stochastic.d.toFixed(1)}`}
            color={analysis.indicators.stochastic.k < 20 ? Colors.light.green : analysis.indicators.stochastic.k > 80 ? Colors.light.red : undefined} />
          <IndicatorCard title="ATR" value={analysis.indicators.atr.toFixed(2)} subtitle="Volatility" />
          <IndicatorCard title="ADX" value={analysis.indicators.adx.toFixed(1)}
            subtitle={analysis.indicators.adx > 25 ? "Trending" : "Ranging"}
            color={analysis.indicators.adx > 25 ? Colors.light.green : Colors.light.orange} />
          <IndicatorCard title="CCI" value={analysis.indicators.cci.toFixed(0)}
            color={analysis.indicators.cci > 100 ? Colors.light.red : analysis.indicators.cci < -100 ? Colors.light.green : undefined} />
          <IndicatorCard title="MFI" value={analysis.indicators.mfi.toFixed(1)}
            subtitle={analysis.indicators.mfi > 80 ? "Overbought" : analysis.indicators.mfi < 20 ? "Oversold" : "Normal"}
            color={analysis.indicators.mfi > 80 ? Colors.light.red : analysis.indicators.mfi < 20 ? Colors.light.green : undefined} />
          <IndicatorCard title="Williams %R" value={analysis.indicators.williamsR.toFixed(1)}
            color={analysis.indicators.williamsR < -80 ? Colors.light.green : analysis.indicators.williamsR > -20 ? Colors.light.red : undefined} />
        </View>

        <Text style={styles.sectionHeader}>Support & Resistance</Text>
        <View style={styles.srCard}>
          <View style={styles.srRow}>
            <View style={styles.srItem}>
              <View style={[styles.srDot, { backgroundColor: Colors.light.green }]} />
              <Text style={styles.srLabel}>Support</Text>
            </View>
            <Text style={[styles.srValue, { color: Colors.light.green }]}>${analysis.supportLevel.toFixed(2)}</Text>
          </View>
          <View style={styles.srDivider} />
          <View style={styles.srRow}>
            <View style={styles.srItem}>
              <View style={[styles.srDot, { backgroundColor: Colors.light.tint }]} />
              <Text style={styles.srLabel}>Pivot</Text>
            </View>
            <Text style={[styles.srValue, { color: Colors.light.tint }]}>${analysis.indicators.pivotPoints.pivot.toFixed(2)}</Text>
          </View>
          <View style={styles.srDivider} />
          <View style={styles.srRow}>
            <View style={styles.srItem}>
              <View style={[styles.srDot, { backgroundColor: Colors.light.red }]} />
              <Text style={styles.srLabel}>Resistance</Text>
            </View>
            <Text style={[styles.srValue, { color: Colors.light.red }]}>${analysis.resistanceLevel.toFixed(2)}</Text>
          </View>
        </View>

        <Text style={styles.sectionHeader}>Moving Averages</Text>
        <View style={styles.maCard}>
          {[
            { label: "EMA 9", val: analysis.indicators.ema9 },
            { label: "SMA 20", val: analysis.indicators.sma20 },
            { label: "EMA 26", val: analysis.indicators.ema26 },
            { label: "SMA 50", val: analysis.indicators.sma50 },
            { label: "EMA 50", val: analysis.indicators.ema50 },
            { label: "SMA 200", val: analysis.indicators.sma200 },
          ].map((ma, i) => (
            <View key={i} style={styles.maRow}>
              <Text style={styles.maLabel}>{ma.label}</Text>
              <Text style={styles.maValue}>${ma.val.toFixed(2)}</Text>
              <Text style={[styles.maSignal, { color: analysis.currentPrice > ma.val ? Colors.light.green : Colors.light.red }]}>
                {analysis.currentPrice > ma.val ? "Above" : "Below"}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionHeader}>Ichimoku Cloud</Text>
        <View style={styles.ichCard}>
          {[
            { label: "Tenkan-sen", val: analysis.indicators.ichimoku.tenkan },
            { label: "Kijun-sen", val: analysis.indicators.ichimoku.kijun },
            { label: "Senkou A", val: analysis.indicators.ichimoku.senkouA },
            { label: "Senkou B", val: analysis.indicators.ichimoku.senkouB },
          ].map((item, i) => (
            <View key={i} style={styles.ichRow}>
              <Text style={styles.ichLabel}>{item.label}</Text>
              <Text style={styles.ichValue}>${item.val.toFixed(2)}</Text>
            </View>
          ))}
          <View style={[styles.ichSignal, { borderTopWidth: 1, borderTopColor: Colors.light.divider, paddingTop: 10, marginTop: 4 }]}>
            <Ionicons
              name={analysis.indicators.ichimoku.tenkan > analysis.indicators.ichimoku.kijun ? "arrow-up-circle" : "arrow-down-circle"}
              size={16}
              color={analysis.indicators.ichimoku.tenkan > analysis.indicators.ichimoku.kijun ? Colors.light.green : Colors.light.red}
            />
            <Text style={[styles.ichSignalText, { color: analysis.indicators.ichimoku.tenkan > analysis.indicators.ichimoku.kijun ? Colors.light.green : Colors.light.red }]}>
              {analysis.indicators.ichimoku.tenkan > analysis.indicators.ichimoku.kijun ? "Bullish TK Cross" : "Bearish TK Cross"}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionHeader}>Bollinger Bands</Text>
        <View style={styles.bbCard}>
          <View style={styles.bbRow}><Text style={styles.bbLabel}>Upper Band</Text><Text style={[styles.bbValue, { color: Colors.light.red }]}>${analysis.indicators.bollingerBands.upper.toFixed(2)}</Text></View>
          <View style={styles.bbRow}><Text style={styles.bbLabel}>Middle Band</Text><Text style={styles.bbValue}>${analysis.indicators.bollingerBands.middle.toFixed(2)}</Text></View>
          <View style={styles.bbRow}><Text style={styles.bbLabel}>Lower Band</Text><Text style={[styles.bbValue, { color: Colors.light.green }]}>${analysis.indicators.bollingerBands.lower.toFixed(2)}</Text></View>
          <View style={styles.bbRow}><Text style={styles.bbLabel}>Width</Text><Text style={styles.bbValue}>{analysis.indicators.bollingerBands.width?.toFixed(2) ?? "N/A"}%</Text></View>
          <View style={styles.bbRow}><Text style={styles.bbLabel}>%B Position</Text><Text style={[styles.bbValue, { color: (analysis.indicators.bollingerBands.percentB ?? 50) > 80 ? Colors.light.red : (analysis.indicators.bollingerBands.percentB ?? 50) < 20 ? Colors.light.green : Colors.light.text }]}>{analysis.indicators.bollingerBands.percentB?.toFixed(1) ?? "N/A"}%</Text></View>
        </View>

        <Text style={styles.sectionHeader}>VWAP & Momentum</Text>
        <View style={styles.indicatorGrid}>
          <IndicatorCard title="VWAP" value={`$${analysis.indicators.vwap.toFixed(2)}`}
            subtitle={analysis.currentPrice > analysis.indicators.vwap ? "Above" : "Below"}
            color={analysis.currentPrice > analysis.indicators.vwap ? Colors.light.green : Colors.light.red} />
          <IndicatorCard title="Momentum" value={analysis.indicators.momentum.toFixed(2)}
            color={analysis.indicators.momentum > 0 ? Colors.light.green : Colors.light.red} />
          <IndicatorCard title="ROC" value={`${analysis.indicators.roc.toFixed(3)}%`}
            color={analysis.indicators.roc > 0 ? Colors.light.green : Colors.light.red} />
          <IndicatorCard title="Trend Str" value={analysis.indicators.trendStrength.toFixed(0)}
            subtitle={analysis.indicators.trendStrength > 60 ? "Strong" : analysis.indicators.trendStrength > 30 ? "Moderate" : "Weak"}
            color={analysis.indicators.trendStrength > 60 ? Colors.light.green : Colors.light.orange} />
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  center: { justifyContent: "center", alignItems: "center" },
  scrollContent: { paddingHorizontal: 16 },
  loadingText: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: Colors.light.tint, marginTop: 16 },
  loadingSubtext: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.light.textSecondary, marginTop: 4 },
  errorText: { fontFamily: "Inter_500Medium", fontSize: 16, color: Colors.light.red, marginTop: 12 },
  retryButton: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 16, backgroundColor: Colors.light.card, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText: { fontFamily: "Inter_500Medium", fontSize: 14, color: "#fff" },

  statusBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  marketStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  monitorBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "rgba(239,68,68,0.1)" },
  monitorBtnActive: { backgroundColor: "rgba(34,197,94,0.1)" },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  monitorText: { fontFamily: "Inter_700Bold", fontSize: 12, letterSpacing: 1 },
  refreshInfo: { flexDirection: "row", alignItems: "center", gap: 6 },
  refreshText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.light.textSecondary },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 28, color: Colors.light.tint },
  headerSubtitle: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.light.textSecondary, marginTop: 2 },
  priceContainer: { alignItems: "flex-end" },
  priceText: { fontFamily: "Inter_700Bold", fontSize: 24, color: Colors.light.text },
  priceChangeRow: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 2 },
  priceChange: { fontFamily: "Inter_500Medium", fontSize: 13 },

  warningCard: { borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1.5 },
  warningHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  warningLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  warningTitle: { fontFamily: "Inter_700Bold", fontSize: 13, letterSpacing: 0.5 },
  countdownBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  countdownText: { fontFamily: "Inter_700Bold", fontSize: 14 },
  warningMessage: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.light.text, lineHeight: 20 },

  signalSection: { borderRadius: 16, padding: 20, alignItems: "center", marginBottom: 14, borderWidth: 1, borderColor: Colors.light.cardBorder },
  signalLabel: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.light.textSecondary, letterSpacing: 2, marginBottom: 12 },
  signalBadge: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  signalText: { fontFamily: "Inter_700Bold", fontSize: 24 },
  confidenceText: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
  directionRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  directionText: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.light.textSecondary },

  confluenceCard: { backgroundColor: Colors.light.card, borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: Colors.light.cardBorder },
  confluenceHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  confluenceLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.light.text },
  confluenceBarBg: { height: 8, backgroundColor: Colors.light.backgroundSecondary, borderRadius: 4, marginBottom: 8, overflow: "hidden" },
  confluenceBarFill: { height: "100%", borderRadius: 4 },
  confluenceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  confluenceScore: { fontFamily: "Inter_700Bold", fontSize: 20 },
  confluenceDir: { fontFamily: "Inter_600SemiBold", fontSize: 14 },

  reasoningCard: { backgroundColor: Colors.light.card, borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: Colors.light.cardBorder },
  reasoningHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  reasoningLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.light.tint },
  reasoningText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.light.text, lineHeight: 22 },

  predictionCard: { backgroundColor: Colors.light.card, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.light.cardBorder },
  predictionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.light.text },
  predictionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  predictionItem: { flex: 1, minWidth: "40%", backgroundColor: Colors.light.backgroundSecondary, borderRadius: 8, padding: 12, alignItems: "center" },
  predictionLabel: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.light.textSecondary, marginBottom: 4 },
  predictionValue: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.light.text },

  riskCard: { backgroundColor: Colors.light.card, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.light.cardBorder },
  riskHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  riskGrid: { flexDirection: "row", gap: 10 },
  riskItem: { flex: 1, backgroundColor: Colors.light.backgroundSecondary, borderRadius: 8, padding: 12 },
  riskLabel: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.light.textSecondary, marginBottom: 4 },
  riskValue: { fontFamily: "Inter_700Bold", fontSize: 18 },
  riskHint: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.light.textSecondary, marginTop: 10, fontStyle: 'italic' },

  sectionHeader: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.light.text, marginBottom: 10, marginTop: 4 },

  tfCard: { backgroundColor: Colors.light.card, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: Colors.light.cardBorder },
  tfHeaderRow: { flexDirection: "row", alignItems: "center", paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: Colors.light.divider, marginBottom: 6 },
  tfColLabel: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.light.textSecondary, textTransform: "uppercase" as const },
  tfRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  tfLeft: { flex: 1 },
  tfLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.light.text },
  tfBadge: { flex: 1.5, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: "flex-start" },
  tfTrend: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  tfStrength: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.light.textSecondary, width: 40, textAlign: "center" as const },
  tfRsi: { fontFamily: "Inter_500Medium", fontSize: 13, width: 40, textAlign: "center" as const },

  indicatorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  indicatorCard: { flex: 1, minWidth: "40%", backgroundColor: Colors.light.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.light.cardBorder },
  indicatorTitle: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.light.textSecondary, marginBottom: 6 },
  indicatorValue: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.light.text },
  indicatorSubtitle: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.light.textSecondary, marginTop: 4 },

  srCard: { backgroundColor: Colors.light.card, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.light.cardBorder },
  srRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  srItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  srDot: { width: 8, height: 8, borderRadius: 4 },
  srLabel: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.light.textSecondary },
  srValue: { fontFamily: "Inter_700Bold", fontSize: 16 },
  srDivider: { height: 1, backgroundColor: Colors.light.divider, marginVertical: 12 },

  maCard: { backgroundColor: Colors.light.card, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.light.cardBorder, gap: 12 },
  maRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  maLabel: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.light.textSecondary, flex: 1 },
  maValue: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.light.text, flex: 1, textAlign: "center" as const },
  maSignal: { fontFamily: "Inter_600SemiBold", fontSize: 12, flex: 0.6, textAlign: "right" as const },

  ichCard: { backgroundColor: Colors.light.card, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.light.cardBorder, gap: 10 },
  ichRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  ichLabel: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.light.textSecondary },
  ichValue: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.light.text },
  ichSignal: { flexDirection: "row", alignItems: "center", gap: 6 },
  ichSignalText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },

  bbCard: { backgroundColor: Colors.light.card, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.light.cardBorder, gap: 12 },
  bbRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bbLabel: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.light.textSecondary },
  bbValue: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.light.text },
});
