const express = require("express");
const router = express.Router();
const redis = require("../utils/redis");

// 모든 에이전트의 상태 확인
router.get("/", async (req, res) => {
    const agents = ["builder", "commander", "tester"];
    const statuses = {};
    
    for (const agent of agents) {
        try {
            // Redis에서 태스크와 등록 상태 확인
            const [taskExists, agentInfo] = await Promise.all([
                redis.exists(`agent:${agent}:tasks`),
                redis.hgetall(`agent:${agent}:info`)
            ]);
            
            statuses[agent] = {
                hasTodo: taskExists === 1,
                isRegistered: agentInfo && agentInfo.name ? true : false
            };
        } catch (e) {
            console.error(`Error checking status for ${agent}:`, e);
            statuses[agent] = {
                hasTodo: false,
                isRegistered: false
            };
        }
    }
    
    res.json(statuses);
});

// 특정 에이전트의 상태 확인
router.get("/:agent", async (req, res) => {
    const agent = req.params.agent;
    
    try {
        const [taskExists, agentInfo] = await Promise.all([
            redis.exists(`agent:${agent}:tasks`),
            redis.hgetall(`agent:${agent}:info`)
        ]);
        
        res.json({
            agent,
            hasTodo: taskExists === 1,
            isRegistered: agentInfo && agentInfo.name ? true : false,
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        console.error(`Error checking status for ${agent}:`, e);
        res.status(500).json({ error: "상태 확인 실패" });
    }
});

module.exports = router;