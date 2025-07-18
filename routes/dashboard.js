const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const REGISTRY_DIR = path.join(__dirname, '../registry');
const LOGS_DIR = path.join(__dirname, '../logs');

if (!fs.existsSync(REGISTRY_DIR)) fs.mkdirSync(REGISTRY_DIR);
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR);

router.get('/agents', (req, res) => {
    const agents = [];
    const files = fs.readdirSync(REGISTRY_DIR);
    files.forEach((file) => {
        const json = fs.readFileSync(path.join(REGISTRY_DIR, file));
        agents.push(JSON.parse(json));
    });
    res.json(agents);
});

router.get('/logs/:agent', (req, res) => {
    const files = fs.readdirSync(LOGS_DIR).filter(f => f.startsWith(req.params.agent));
    if (files.length === 0) return res.status(404).send('No logs');
    const latest = files.sort().reverse()[0];
    const content = fs.readFileSync(path.join(LOGS_DIR, latest), 'utf-8');
    res.type('text/plain').send(content);
});

module.exports = router; // ← 이거 꼭 있어야 함!
