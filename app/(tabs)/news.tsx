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
import Colors from "@/constants/colors";
import { queryClient } from "@/lib/query-client";

interface NewsItem {
  title: string;
  summary: string;
  sentiment: string;
  time: string;
  source: string;
}

function NewsCard({ item }: { item: NewsItem }) {
  const sentimentColor =
    item.sentiment === "bullish"
      ? Colors.light.green
      : item.sentiment === "bearish"
      ? Colors.light.red
      : Colors.light.orange;
  const sentimentBg =
    item.sentiment === "bullish"
      ? Colors.light.greenBg
      : item.sentiment === "bearish"
      ? Colors.light.redBg
      : Colors.light.orangeBg;
  const sentimentIcon =
    item.sentiment === "bullish"
      ? "trending-up"
      : item.sentiment === "bearish"
      ? "trending-down"
      : "swap-horizontal";

  return (
    <View style={styles.newsCard}>
      <View style={styles.newsHeader}>
        <View style={[styles.sentimentBadge, { backgroundColor: sentimentBg }]}>
          <Ionicons name={sentimentIcon as any} size={12} color={sentimentColor} />
          <Text style={[styles.sentimentText, { color: sentimentColor }]}>
            {item.sentiment.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.newsTime}>{item.time}</Text>
      </View>
      <Text style={styles.newsTitle}>{item.title}</Text>
      <Text style={styles.newsSummary}>{item.summary}</Text>
      <View style={styles.sourceRow}>
        <MaterialCommunityIcons name="newspaper-variant-outline" size={14} color={Colors.light.textSecondary} />
        <Text style={styles.sourceText}>{item.source}</Text>
      </View>
    </View>
  );
}

export default function NewsScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const {
    data: news,
    isLoading,
    isRefetching,
  } = useQuery<NewsItem[]>({
    queryKey: ["/api/gold/news"],
    staleTime: 60000,
    refetchInterval: 300000, // Auto refresh every 5 minutes
  });

  const sortedNews = React.useMemo(() => {
    if (!news) return [];
    // Sort by timestamp if available, otherwise just reverse to show latest first
    // Most news APIs return latest first, but if our mock/source returns oldest first, we reverse it.
    // Let's add a more robust sorting if item.time is a valid date string.
    return [...news].sort((a, b) => {
      const dateA = new Date(a.time).getTime();
      const dateB = new Date(b.time).getTime();
      if (!isNaN(dateA) && !isNaN(dateB)) {
        return dateB - dateA; // Latest first
      }
      return 0; // Keep original order if date is invalid
    });
  }, [news]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/gold/news"] });
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <Text style={styles.loadingText}>Loading market news...</Text>
      </View>
    );
  }

  const bullishCount = (news || []).filter((n) => n.sentiment === "bullish").length;
  const bearishCount = (news || []).filter((n) => n.sentiment === "bearish").length;
  const neutralCount = (news || []).filter((n) => n.sentiment === "neutral").length;

  const overallSentiment =
    bullishCount > bearishCount
      ? "Bullish"
      : bearishCount > bullishCount
      ? "Bearish"
      : "Mixed";
  const sentimentColor =
    overallSentiment === "Bullish"
      ? Colors.light.green
      : overallSentiment === "Bearish"
      ? Colors.light.red
      : Colors.light.orange;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + webTopInset + 16, paddingBottom: 100 },
        ]}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={Colors.light.tint} />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Market News</Text>
        <Text style={styles.screenSubtitle}>Gold & Forex Market Intelligence</Text>

        <View style={styles.sentimentOverview}>
          <Text style={styles.overviewLabel}>MARKET SENTIMENT</Text>
          <Text style={[styles.overviewValue, { color: sentimentColor }]}>{overallSentiment}</Text>
          <View style={styles.sentimentBreakdown}>
            <View style={styles.sentimentItem}>
              <View style={[styles.sentimentDot, { backgroundColor: Colors.light.green }]} />
              <Text style={styles.sentimentCount}>
                {bullishCount} Bullish
              </Text>
            </View>
            <View style={styles.sentimentItem}>
              <View style={[styles.sentimentDot, { backgroundColor: Colors.light.red }]} />
              <Text style={styles.sentimentCount}>
                {bearishCount} Bearish
              </Text>
            </View>
            <View style={styles.sentimentItem}>
              <View style={[styles.sentimentDot, { backgroundColor: Colors.light.orange }]} />
              <Text style={styles.sentimentCount}>
                {neutralCount} Neutral
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.impactNote}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.light.blue} />
          <Text style={styles.impactText}>
            News sentiment is factored into the AI prediction model to improve accuracy.
          </Text>
        </View>

        {!sortedNews || sortedNews.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="inbox" size={32} color={Colors.light.textSecondary} />
            <Text style={styles.emptyText}>No news available</Text>
            <Pressable style={styles.retryButton} onPress={handleRefresh}>
              <Feather name="refresh-cw" size={16} color="#fff" />
              <Text style={styles.retryText}>Refresh</Text>
            </Pressable>
          </View>
        ) : (
          sortedNews.map((item, i) => <NewsCard key={i} item={item} />)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  loadingText: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginTop: 12,
  },
  screenTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: Colors.light.text,
  },
  screenSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 4,
    marginBottom: 20,
  },
  sentimentOverview: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
  },
  overviewLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: Colors.light.textSecondary,
    letterSpacing: 2,
    marginBottom: 8,
  },
  overviewValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    marginBottom: 14,
  },
  sentimentBreakdown: {
    flexDirection: "row",
    gap: 16,
  },
  sentimentItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sentimentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sentimentCount: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  impactNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: Colors.light.blueBg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  impactText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.light.blue,
    flex: 1,
    lineHeight: 20,
  },
  newsCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  newsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sentimentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  sentimentText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  newsTime: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.light.textSecondary,
    opacity: 0.8,
  },
  newsTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: Colors.light.text,
    marginBottom: 8,
    lineHeight: 24,
  },
  newsSummary: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 22,
    marginBottom: 14,
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.light.cardBorder,
    paddingTop: 12,
  },
  sourceText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  emptyCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 40,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
  },
  emptyText: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginTop: 12,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: "#000",
  },
});
