/**
 * Main script that reads CSV, enriches with API data, and outputs JSON
 */

// Import Node.js built-in modules
import * as fs from 'fs';              // File system operations
import * as path from 'path';          // Path manipulation
import { parse } from 'csv-parse/sync'; // CSV parsing library

// TypeScript Interface - defines shape of streaming event
// This ensures type safety - TypeScript will check all objects match this shape
interface StreamingEvent {
    userId: string;        // UUID of user
    songId: string;        // UUID of song
    timestamp: string;     // ISO 8601 date string
    durationMs: number;    // Duration in milliseconds (number, not string)
}

// Interface for song metadata from API
interface SongMetadata {
    songId: string;
    title: string;
    artist: string;
    releaseDate: string;
}

// Interface combining both - extends means "has all fields from StreamingEvent plus these"
interface EnrichedEvent extends StreamingEvent {
    title: string;
    artist: string;
    releaseDate: string;
}

// Cache to store fetched song data
// Map is like an object but with better performance for frequent adds/deletes
// Generic type Map<K,V> where K=key type, V=value type
const songCache: Map<string, SongMetadata> = new Map();

// Async function to fetch song metadata from API
// Returns Promise that resolves to SongMetadata or null
async function fetchSongMetadata(songId: string): Promise<SongMetadata | null> {
    // Check if we already have this song cached
    if (songCache.has(songId)) {
        // ! tells TypeScript "I know this isn't undefined"
        return songCache.get(songId)!;
    }

    try {
        // Fetch from API using native fetch (available in Node 18+)
        const response = await fetch(`http://localhost:3000/songs/${songId}`);

        // Check if request was successful
        if (!response.ok) {
            console.error(`Failed to fetch metadata for song ${songId}: ${response.status}`);
            return null;  // Return null instead of throwing error
        }

        // Parse JSON response
        const metadata = await response.json();

        // Store in cache for future use
        songCache.set(songId, metadata);

        return metadata;
    } catch (error) {
        // Network or parsing error
        console.error(`Failed to fetch metadata for song ${songId}:`, error);
        return null;
    }
}

// Function to enrich all events with metadata
async function enrichEvents(events: StreamingEvent[]): Promise<EnrichedEvent[]> {
    // Array to store enriched events
    const enrichedEvents: EnrichedEvent[] = [];

    // Get unique song IDs to minimize API calls
    // Set automatically removes duplicates
    // Spread operator (...) converts Set back to array
    const uniqueSongIds = [...new Set(events.map(e => e.songId))];
    console.log(`Found ${uniqueSongIds.length} unique songs`);

    // Fetch metadata for all unique songs
    for (let i = 0; i < uniqueSongIds.length; i++) {
        await fetchSongMetadata(uniqueSongIds[i]);

        // Log progress every 10 songs
        if ((i + 1) % 10 === 0) {
            console.log(`Fetched metadata for ${i + 1}/${uniqueSongIds.length} songs`);
        }
    }

    // Now enrich each event using cached metadata
    for (const event of events) {
        const metadata = songCache.get(event.songId);

        if (metadata) {
            // Spread operator combines all fields from event and metadata
            enrichedEvents.push({
                ...event,                    // All original fields
                title: metadata.title,       // Add title
                artist: metadata.artist,     // Add artist
                releaseDate: metadata.releaseDate // Add release date
            });
        } else {
            console.warn(`Skipping event for song ${event.songId} - metadata not available`);
        }
    }

    return enrichedEvents;
}

// Main function - entry point of script
async function main() {
    console.log("Script execution started");

    try {
        // Test if API is running
        const testRes = await fetch("http://localhost:3000/test");
        const testData = await testRes.json();
        console.log("API test:", testData);

        // Build path to CSV file
        // __dirname = directory of this script (scripts/)
        const csvPath = path.join(__dirname, '../static/data/streamingEvents.csv');

        // Check if file exists
        if (!fs.existsSync(csvPath)) {
            console.error(`CSV file not found at ${csvPath}`);
            process.exit(1);  // Exit with error code
        }

        // Read entire file into memory as string
        const csvContent = fs.readFileSync(csvPath, 'utf-8');

        // Parse CSV content into array of objects
        const events: StreamingEvent[] = parse(csvContent, {
            columns: true,           // Use first row as column names
            skip_empty_lines: true,  // Ignore blank lines
            cast: (value, context) => {
                // Custom parsing for durationMs column
                if (context.column === 'durationMs') {
                    return parseInt(value, 10);  // Convert string to number
                }
                return value;  // Leave other columns as strings
            }
        });

        console.log(`Parsed ${events.length} streaming events`);

        // Enrich events with song metadata
        console.log('Enriching events with song metadata...');
        const enrichedEvents = await enrichEvents(events);

        console.log(`Successfully enriched ${enrichedEvents.length} events`);

        // Write output to JSON file
        const outputPath = path.join(__dirname, '../output.json');
        // JSON.stringify with null, 2 adds pretty formatting with 2-space indent
        fs.writeFileSync(outputPath, JSON.stringify(enrichedEvents, null, 2));

        console.log(`Output written to ${outputPath}`);
        console.log("Script execution completed successfully");

    } catch (error) {
        console.error("An error occurred:", error);
        process.exit(1);  // Exit with error code
    }
}

// Only run main() if this file is executed directly
// require.main === module is true when file is run directly, false when imported
if (require.main === module) {
    // Run main and catch any unhandled errors
    main().catch((err) => {
        console.error("Unhandled error in main:", err);
        process.exit(1);
    });
}