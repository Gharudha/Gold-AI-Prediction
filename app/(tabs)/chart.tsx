import React, { useState } from "react";
import { StyleSheet, View, Text, Pressable, Platform, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";

const TIMEFRAMES = [
  { label: "M5", value: "5" },
  { label: "M15", value: "15" },
  { label: "M30", value: "30" },
  { label: "1H", value: "60" },
  { label: "4H", value: "240" },
  { label: "1D", value: "D" },
  { label: "1W", value: "W" },
];

export default function ChartScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const [selectedTf, setSelectedTf] = useState("5");
  const [isLoading, setIsLoading] = useState(true);

  const tradingViewHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #0A0E1A; overflow: hidden; }
    .tradingview-widget-container { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div class="tradingview-widget-container">
    <div id="tradingview_chart" style="width:100%;height:100%;"></div>
  </div>
  <script type="text/javascript" src="https://s3.tradingview.com/tv.js"></script>
  <script type="text/javascript">
    new TradingView.widget({
      "autosize": true,
      "symbol": "OANDA:XAUUSD",
      "interval": "${selectedTf}",
      "timezone": "Etc/UTC",
      "theme": "dark",
      "style": "1",
      "locale": "en",
      "toolbar_bg": "#0A0E1A",
      "enable_publishing": false,
      "allow_symbol_change": false,
      "hide_top_toolbar": false,
      "hide_legend": false,
      "save_image": false,
      "container_id": "tradingview_chart",
      "backgroundColor": "#0A0E1A",
      "gridColor": "rgba(30, 39, 64, 0.5)",
      "studies": [
        "RSI@tv-basicstudies",
        "MACD@tv-basicstudies",
        "BB@tv-basicstudies"
      ]
    });
  </script>
</body>
</html>`;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8 }]}>
        <Text style={styles.headerTitle}>XAUUSD Live Chart</Text>
        <View style={styles.timeframeBar}>
          {TIMEFRAMES.map((tf) => (
            <Pressable
              key={tf.value}
              style={[
                styles.tfButton,
                selectedTf === tf.value && styles.tfButtonActive,
              ]}
              onPress={() => {
                setSelectedTf(tf.value);
                setIsLoading(true);
              }}
            >
              <Text
                style={[
                  styles.tfText,
                  selectedTf === tf.value && styles.tfTextActive,
                ]}
              >
                {tf.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.chartContainer}>
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.light.tint} />
            <Text style={styles.loadingText}>Loading Chart...</Text>
          </View>
        )}
        {Platform.OS === "web" ? (
          <iframe
            srcDoc={tradingViewHtml}
            style={{ width: "100%", height: "100%", border: "none" }}
            onLoad={() => setIsLoading(false)}
          />
        ) : (
          <WebView
            source={{ html: tradingViewHtml }}
            style={styles.webview}
            onLoadEnd={() => setIsLoading(false)}
            javaScriptEnabled
            domStorageEnabled
            scalesPageToFit
            originWhitelist={["*"]}
            allowsInlineMediaPlayback
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: Colors.light.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.light.tint,
    marginBottom: 10,
  },
  timeframeBar: {
    flexDirection: "row",
    gap: 4,
  },
  tfButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
    backgroundColor: Colors.light.card,
  },
  tfButtonActive: {
    backgroundColor: Colors.light.tint,
  },
  tfText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  tfTextActive: {
    color: "#000",
  },
  chartContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.light.background,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  loadingText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 12,
  },
});
