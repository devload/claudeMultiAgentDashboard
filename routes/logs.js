const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

const LOGS_DIR = "/Users/rohsunghyun/claudeAuto/logs";

router.get("/:file", (req, res) => {
    const filename = req.params.file;
    const fullPath = path.resolve(LOGS_DIR, filename);
    if (!fullPath.startsWith(LOGS_DIR)) return res.status(403).send("Invalid path");

    if (!fs.existsSync(fullPath)) {
        return res.status(404).send("log file not found");
    }

    res.sendFile(fullPath);
});

module.exports = router;
