# Gold AI Trader

## Overview

Gold AI Trader is a mobile-first application that provides real-time gold (XAU/USD) trading analysis powered by AI. It combines technical analysis, candlestick pattern recognition, and news sentiment analysis to generate buy/sell/neutral predictions with confidence scores. The app features a dashboard with live price data, interactive TradingView charts, detailed technical analysis breakdowns, and gold-related news with sentiment tagging.

The architecture follows a client-server pattern: an Expo/React Native frontend communicates with an Express.js backend that uses OpenAI for AI-powered market analysis.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo / React Native)

- **Framework**: Expo SDK 54 with React Native 0.81, using expo-router for file-based routing
- **Navigation**: Tab-based layout with 4 tabs: Dashboard (`index`), Chart, Analysis, and News
- **State Management**: TanStack React Query for server state (API data fetching, caching, and synchronization)
- **Styling**: Dark theme with gold accent colors defined in `constants/colors.ts`. Uses StyleSheet API directly (no CSS-in-JS library)
- **Fonts**: Inter font family (400, 500, 600, 700 weights) via `@expo-google-fonts/inter`
- **Key UI Libraries**: expo-linear-gradient, expo-blur, expo-glass-effect, react-native-reanimated, react-native-gesture-handler
- **Platform Support**: Primarily mobile (iOS/Android) with web fallback support. The chart tab uses `react-native-webview` with embedded TradingView widget for interactive charts
- **API Communication**: Custom `apiRequest` helper in `lib/query-client.ts` that constructs URLs from `EXPO_PUBLIC_DOMAIN` environment variable

### Backend (Express.js)

- **Runtime**: Node.js with TypeScript (compiled via tsx in dev, esbuild for production)
- **Server Entry**: `server/index.ts` sets up Express with CORS handling for Replit domains and localhost
- **API Routes** (defined in `server/routes.ts`):
  - `GET /api/gold/analysis` — Multi-timeframe AI analysis with predictions
  - `GET /api/gold/candles/:timeframe` — Candlestick data for specified timeframe
  - `GET /api/gold/news` — Gold-related news with sentiment analysis
- **AI Analysis Engine** (`server/gold-data.ts`): Core module that calculates technical indicators (RSI, MACD, Bollinger Bands, Ichimoku, etc.), detects candlestick patterns, and uses OpenAI to generate trading predictions
- **Static File Serving**: In production, serves pre-built Expo web bundle; in development, proxies to Expo dev server

### Database

- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` (users table) and `shared/models/chat.ts` (conversations and messages tables)
- **Schema Details**:
  - `users` table: id (UUID, auto-generated), username (unique), password
  - `conversations` table: id (serial), title, created_at
  - `messages` table: id (serial), conversation_id (FK to conversations), role, content, created_at
- **Storage Layer**: `server/storage.ts` currently uses in-memory storage (`MemStorage`) for users; chat storage (`server/replit_integrations/chat/storage.ts`) uses Drizzle with actual PostgreSQL
- **Migrations**: Managed via `drizzle-kit push` command; config in `drizzle.config.ts`
- **Connection**: Requires `DATABASE_URL` environment variable for PostgreSQL

### Replit Integrations

Located in `server/replit_integrations/`, these are pre-built modules:
- **Chat**: Conversation CRUD and message management with OpenAI streaming
- **Audio**: Voice chat with speech-to-text, text-to-speech, and audio format conversion
- **Image**: Image generation using `gpt-image-1` model
- **Batch**: Generic batch processing utility with rate limiting and retries (using p-limit and p-retry)

### Build & Deployment

- **Development**: Two processes run simultaneously — `expo:dev` for the mobile/web client and `server:dev` for the Express backend
- **Production Build**: `expo:static:build` creates a static web bundle, `server:build` uses esbuild to bundle the server
- **Production Run**: `server:prod` serves both the API and the static web bundle
- **Build Script**: `scripts/build.js` handles the Expo static export process with Metro bundler

### Path Aliases

- `@/*` maps to project root
- `@shared/*` maps to `./shared/*`

## External Dependencies

### Required Environment Variables

- `DATABASE_URL` — PostgreSQL connection string
- `AI_INTEGRATIONS_OPENAI_API_KEY` — OpenAI API key (via Replit AI Integrations)
- `AI_INTEGRATIONS_OPENAI_BASE_URL` — OpenAI API base URL (via Replit AI Integrations)
- `EXPO_PUBLIC_DOMAIN` — Public domain for API requests (auto-set on Replit)
- `REPLIT_DEV_DOMAIN` — Development domain (auto-set on Replit)

### Third-Party Services

- **OpenAI API**: Used for AI-powered gold market analysis, chat completions, image generation, and speech processing. Accessed through Replit's AI Integrations proxy
- **TradingView**: Embedded widget in the Chart tab for interactive gold price charting (loaded via WebView from TradingView's CDN)
- **PostgreSQL**: Primary database for persistent storage (conversations, messages, users)

### Key NPM Dependencies

- `expo` (SDK 54) — Mobile app framework
- `express` (v5) — Backend HTTP server
- `openai` — OpenAI API client
- `drizzle-orm` + `drizzle-zod` — Database ORM with Zod validation
- `@tanstack/react-query` — Client-side data fetching
- `pg` — PostgreSQL client driver
- `react-native-webview` — For TradingView chart embedding
- `p-limit` / `p-retry` — Rate limiting and retry logic for batch processing