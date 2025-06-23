# Music Streaming Analytics

A TypeScript/Node.js application that processes music streaming data, enriches it with metadata, and provides analytics insights.

## Features

- **Data Ingestion**: Reads streaming events from CSV and enriches with song metadata
- **Analytics CLI**: Provides insights on top songs, user listening patterns, and artist royalties
- **REST API**: Serves song metadata via Express.js

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn

## Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/music-streaming-analytics.git
cd music-streaming-analytics

# Install dependencies
npm install
```

## Project Structure

```
music-streaming-analytics/
├── scripts/
│   ├── ingest.ts        # Data enrichment script
│   └── analytics.ts     # Analytics CLI
├── src/
│   └── server.ts        # Express API server
├── static/
│   └── data/
│       ├── songs.json   # Song metadata
│       └── streamingEvents.csv  # Raw streaming data
└── output.json         # Enriched data (generated)
```

## Usage

### 1. Start the API Server

```bash
npm start
```

The server will run on `http://localhost:3000`

### 2. Run Data Ingestion

```bash
npm run ingest
```

This will:
- Read streaming events from CSV
- Fetch metadata for each song from the API
- Generate `output.json` with enriched data

### 3. Run Analytics

```bash
# Get top 5 songs in a date range
npm run analytics -- top-songs "2025-03-01T00:00:00Z" "2025-04-30T23:59:59Z" 5

# Get user's listening timeline
npm run analytics -- timeline "USER_ID" 2

# Calculate artist payout
npm run analytics -- payout "Artist Name" 2
```

## API Endpoints

- `GET /test` - Health check
- `GET /songs/:songId` - Get song metadata by ID

## Analytics Commands

### top-songs
Find the most played songs in a date range
```bash
npm run analytics -- top-songs <start_date> <end_date> <count>
```

### timeline
Show a user's top songs and artists by month
```bash
npm run analytics -- timeline <user_id> <months>
```

### payout
Calculate artist royalties (only streams > 10 seconds)
```bash
npm run analytics -- payout <artist_name> <months>
```

## Development

```bash
# Run TypeScript compiler
npm run build

# Run server in development mode with auto-reload
npm run dev
```

## Technologies Used

- **TypeScript** - Type-safe JavaScript
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **csv-parse** - CSV parsing library

## License

MIT