const fs = require("fs");
const path = require("path");
const express = require("express");
const router = express.Router();

const TASKS_DIR = path.join(__dirname, "..", "tasks");
const REGISTRY_DIR = path.join(__dirname, "..", "registry");

// 모든 에이전트의 상태 확인
router.get("/", (req, res) => {
    const agents = ["builder", "commander", "tester"];
    const statuses = {};
    
    agents.forEach(agent => {
        const todoFile = path.join(TASKS_DIR, `${agent}.todo`);
        const registryFile = path.join(REGISTRY_DIR, `${agent}.json`);
        
        statuses[agent] = {
            hasTodo: fs.existsSync(todoFile),
            isRegistered: fs.existsSync(registryFile)
        };
    });
    
    res.json(statuses);
});

// 특정 에이전트의 상태 확인
router.get("/:agent", (req, res) => {
    const agent = req.params.agent;
    const todoFile = path.join(TASKS_DIR, `${agent}.todo`);
    const registryFile = path.join(REGISTRY_DIR, `${agent}.json`);
    
    res.json({
        agent,
        hasTodo: fs.existsSync(todoFile),
        isRegistered: fs.existsSync(registryFile),
        timestamp: new Date().toISOString()
    });
});

module.exports = router;