#!/usr/bin/env node
// Shebang line - tells system to use node to run this file

import * as fs from 'fs';
import * as path from 'path';

// Interface for enriched events (must match output.json structure)
interface EnrichedEvent {
    userId: string;
    songId: string;
    timestamp: string;
    durationMs: number;
    title: string;
    artist: string;
    releaseDate: string;
}

// Function to load events from output.json
function loadEvents(): EnrichedEvent[] {
    const outputPath = path.join(__dirname, '../output.json');

    // Check if output.json exists
    if (!fs.existsSync(outputPath)) {
        console.error('Error: output.json not found. Please run the ingestion script first.');
        process.exit(1);
    }

    // Read and parse JSON file
    const content = fs.readFileSync(outputPath, 'utf-8');
    return JSON.parse(content);
}

// Parse command line arguments
// process.argv is array: [node, script.js, ...args]
// slice(2) removes first two elements
const args = process.argv.slice(2);
const command = args[0];

// Validate command was provided
if (!command) {
    console.error('Please specify a command: top-songs, timeline, or payout');
    process.exit(1);
}

// Command: top-songs <start> <end> <n>
// Find top N most played songs in date range
if (command === 'top-songs') {
    // Validate argument count
    if (args.length !== 4) {
        console.error('Usage: top-songs <start> <end> <n>');
        process.exit(1);
    }

    // Destructure args array, _ is placeholder for unused first element
    const [_, start, end, nStr] = args;
    const n = parseInt(nStr, 10);  // Convert string to number, base 10

    const events = loadEvents();

    // Convert date strings to Date objects for comparison
    const startDate = new Date(start);
    const endDate = new Date(end);

    // Filter events within date range
    const filteredEvents = events.filter(event => {
        const eventDate = new Date(event.timestamp);
        // Return true if event is within range (inclusive)
        return eventDate >= startDate && eventDate <= endDate;
    });

    // Count plays per song using Map
    const songCounts = new Map<string, number>();

    filteredEvents.forEach(event => {
        // Get current count or 0 if not exists, then increment
        songCounts.set(event.songId, (songCounts.get(event.songId) || 0) + 1);
    });

    // Convert Map to array of [songId, count] pairs
    // Sort by count descending (b[1] - a[1])
    // Take first n elements
    // Extract just the songId
    const topSongsList = Array.from(songCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([songId]) => songId);

    // Output one song ID per line
    topSongsList.forEach(songId => {
        console.log(songId);
    });
}

// Command: timeline <userId> <months>
// Show user's top song and artist for each of last M months
else if (command === 'timeline') {
    if (args.length !== 3) {
        console.error('Usage: timeline <userId> <months>');
        process.exit(1);
    }

    const [_, userId, monthsStr] = args;
    const months = parseInt(monthsStr, 10);

    const events = loadEvents();

    // Find the latest date in data to use as "now"
    // This ensures we look at the right months
    const eventDates = events.map(e => new Date(e.timestamp));
    const latestDate = new Date(Math.max(...eventDates.map(d => d.getTime())));

    let hasAnyData = false;

    // Process each month, starting from M months ago
    for (let i = months - 1; i >= 0; i--) {
        // Calculate month boundaries
        const monthDate = new Date(latestDate.getFullYear(), latestDate.getMonth() - i, 1);
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        // Last day of month at 23:59:59.999
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);

        // Filter events for this user in this month
        const monthEvents = events.filter(event => {
            const eventDate = new Date(event.timestamp);
            return event.userId === userId &&
                eventDate >= monthStart &&
                eventDate <= monthEnd;
        });

        // Skip if no events this month
        if (monthEvents.length === 0) {
            continue;
        }

        hasAnyData = true;

        // Count plays per song
        // Map key is songId, value is object with count and title
        const songCounts = new Map<string, { count: number; title: string }>();
        const artistCounts = new Map<string, number>();

        monthEvents.forEach(event => {
            // Update song count
            const current = songCounts.get(event.songId) || { count: 0, title: event.title };
            songCounts.set(event.songId, {
                count: current.count + 1,
                title: event.title
            });

            // Update artist count
            artistCounts.set(event.artist, (artistCounts.get(event.artist) || 0) + 1);
        });

        // Find top song by play count
        const topSong = Array.from(songCounts.entries())
            .sort((a, b) => b[1].count - a[1].count)[0];

        // Find top artist by play count
        const topArtist = Array.from(artistCounts.entries())
            .sort((a, b) => b[1] - a[1])[0];

        // Format output as YYYY-MM
        const year = monthDate.getFullYear();
        const month = String(monthDate.getMonth() + 1).padStart(2, '0');
        console.log(`${year}-${month}: Top Song - ${topSong[1].title}, Top Artist - ${topArtist[0]}`);
    }

    // If user had no data at all
    if (!hasAnyData) {
        console.log(`No data found for user ${userId} in the last ${months} months`);
    }
}

// Command: payout <artist> <months>
// Calculate royalty payment for artist
else if (command === 'payout') {
    if (args.length !== 3) {
        console.error('Usage: payout <artist> <months>');
        process.exit(1);
    }

    const [_, artist, monthsStr] = args;
    const months = parseInt(monthsStr, 10);

    const events = loadEvents();

    // Get latest date from data
    const eventDates = events.map(e => new Date(e.timestamp));
    const latestDate = new Date(Math.max(...eventDates.map(d => d.getTime())));

    // Calculate start date (M months before latest date)
    const startDate = new Date(latestDate.getFullYear(), latestDate.getMonth() - months + 1, 1);

    // Filter events for this artist
    const artistEvents = events.filter(event => {
        const eventDate = new Date(event.timestamp);
        return event.artist.toLowerCase() === artist.toLowerCase() &&  // Case-insensitive
            eventDate >= startDate &&
            event.durationMs > 10000;  // Only streams > 10 seconds count
    });

    // Sum up total milliseconds
    const totalMs = artistEvents.reduce((sum, event) => sum + event.durationMs, 0);

    // Convert to minutes
    const totalMinutes = totalMs / 60000;

    // Calculate payout at $0.001 per minute
    const payoutAmount = totalMinutes * 0.001;

    // Output with 2 decimal places
    console.log(`$${payoutAmount.toFixed(2)}`);
}

// Handle unknown commands
else {
    console.error(`Unknown command: ${command}`);
    console.error('Available commands: top-songs, timeline, payout');
    process.exit(1);
}