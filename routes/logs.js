const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

const LOGS_DIR = "/Users/devload/claueAI/logs";

router.get("/:filename", (req, res) => {
    const filename = req.params.filename;
    
    // Security check: prevent directory traversal
    if (filename.includes("..") || filename.includes("/")) {
        return res.status(403).json({ 
            error: "Invalid filename. Directory traversal not allowed." 
        });
    }
    
    const fullPath = path.join(LOGS_DIR, filename);
    
    // Additional security check
    if (!fullPath.startsWith(LOGS_DIR)) {
        return res.status(403).json({ 
            error: "Access denied. Invalid path." 
        });
    }

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ 
            error: "Log file not found",
            filename: filename,
            searchPath: LOGS_DIR
        });
    }
    
    // Check if it's a file (not a directory)
    const stats = fs.statSync(fullPath);
    if (!stats.isFile()) {
        return res.status(400).json({ 
            error: "Requested resource is not a file" 
        });
    }

    // Send the file
    res.sendFile(fullPath, (err) => {
        if (err) {
            console.error(`Error sending log file ${filename}:`, err);
            if (!res.headersSent) {
                res.status(500).json({ 
                    error: "Error sending file",
                    details: err.message
                });
            }
        }
    });
});

module.exports = router;
