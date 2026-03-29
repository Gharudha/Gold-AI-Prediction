import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { getMultiTimeframeAnalysis, getCandles, getGoldNews } from "./gold-data";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/gold/analysis", async (_req, res) => {
    try {
      const analysis = await getMultiTimeframeAnalysis();
      res.json(analysis);
    } catch (error) {
      console.error("Analysis error:", error);
      res.status(500).json({ error: "Failed to perform analysis" });
    }
  });

  app.get("/api/gold/candles/:timeframe", async (req, res) => {
    try {
      const { timeframe } = req.params;
      const count = parseInt(req.query.count as string) || 50;
      const candles = await getCandles(timeframe, count);
      res.json(candles);
    } catch (error) {
      console.error("Candles error:", error);
      res.status(500).json({ error: "Failed to fetch candle data" });
    }
  });

  app.get("/api/gold/news", async (_req, res) => {
    try {
      const news = await getGoldNews();
      res.json(news);
    } catch (error) {
      console.error("News error:", error);
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
