// Import required modules
import express, { Request, Response, Application } from "express";
import * as fs from "fs";
import * as path from "path";

console.log("Starting application");

// Create Express application instance
const app: Application = express();

// Interface for song data
interface Song {
    songId: string;
    title: string;
    artist: string;
    releaseDate: string;
}

// Function to load songs data from JSON file
const loadSongsData = (): { songs: Song[] } => {
    try {
        // __dirname is the directory of current file (src/)
        // We go up one level (..) then into static/data/songs.json
        const songsFilePath = path.join(__dirname, "../static/data/songs.json");

        // Read file synchronously and parse JSON
        // readFileSync blocks until file is read (ok for startup)
        const songsData = JSON.parse(fs.readFileSync(songsFilePath, "utf8"));

        return songsData;
    } catch (error) {
        // If file read fails, log error and return empty array
        console.error("Error loading songs data:", error);
        return { songs: [] };
    }
};

// Define GET endpoint for root path
app.get("/", (req: Request, res: Response): void => {
    res.send({
        message: "Music Streaming Analytics API",
        endpoints: {
            health: "GET /test",
            song: "GET /songs/:songId"
        }
    });
});

// Define GET endpoint for health check
app.get("/test", (req: Request, res: Response): void => {
    res.send({ message: "Hello World!" });
});

// Define GET endpoint with URL parameter
// Using a simpler approach that TypeScript handles better
app.get("/songs/:songId", (req: Request, res: Response): void => {
    try {
        // Extract songId from URL parameters
        const songId = req.params.songId;

        // Load all songs data
        const songsData = loadSongsData();

        // Find song with matching ID
        const song = songsData.songs.find((song) => song.songId === songId);

        // If no song found, return 404 error
        if (!song) {
            res.status(404).json({ error: "Song not found" });
            return;
        }

        // Return the found song as JSON
        res.json(song);
    } catch (error) {
        // Handle any unexpected errors
        console.error("Error retrieving song:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Serve static files from 'static' directory
app.use(express.static("static"));

// Start server on port 3000
const port = 3000;
const server = app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});

// Graceful shutdown function
const shutdown = async (): Promise<void> => {
    server.close();
};

// Handle termination signal (Ctrl+C)
process.once("SIGTERM", async () => {
    console.log("Stopping application");
    await shutdown();
    process.exit();
});