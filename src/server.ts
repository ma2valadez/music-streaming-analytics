// Import required modules
import express from "express";        // Web framework for Node.js
import * as fs from "fs";           // File system module to read files
import * as path from "path";       // Path module to work with file paths

console.log("Starting application");

// Create Express application instance
const app = express();

// Function to load songs data from JSON file
// Arrow function with return type annotation
const loadSongsData = (): { songs: any[] } => {
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

// Define GET endpoint for health check
// async keyword allows use of await (though not used here)
// req = request object, res = response object
app.get("/test", async (req, res) => {
    // Send JSON response
    res.send({ message: "Hello World!" });
});

// Define GET endpoint with URL parameter
// :songId is a route parameter - captures value from URL
app.get("/songs/:songId", async (req, res) => {
    try {
        // Extract songId from URL parameters
        const songId = req.params.songId;

        // Load all songs data
        const songsData = loadSongsData();

        // Find song with matching ID
        // Array.find returns first element where condition is true
        const song = songsData.songs.find((song) => song.songId === songId);

        // If no song found, return 404 error
        if (!song) {
            return res.status(404).json({ error: "Song not found" });
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
const shutdown = async () => {
    server.close();
};

// Handle termination signal (Ctrl+C)
process.once("SIGTERM", async function () {
    console.log("Stopping application");
    await shutdown();
    process.exit();
});