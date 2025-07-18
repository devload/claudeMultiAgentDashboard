const express = require("express");
const router = express.Router();
const redis = require("../utils/redis");

// 모든 에이전트 목록 조회
router.get("/", async (req, res) => {
    try {
        // Redis에서 모든 에이전트 정보 조회
        const agentKeys = await redis.keys('agent:*:info');
        const agents = [];
        
        for (const key of agentKeys) {
            try {
                const agentData = await redis.hgetall(key);
                if (agentData && agentData.name) {
                    agents.push({
                        name: agentData.name,
                        role: agentData.role || 'unknown',
                        status: agentData.status || 'unknown',
                        started: agentData.started || null
                    });
                }
            } catch (e) {
                console.warn(`Failed to get agent data for ${key}:`, e);
            }
        }
        
        // 이름순으로 정렬
        agents.sort((a, b) => a.name.localeCompare(b.name));
        
        res.json(agents);
    } catch (err) {
        console.error('에이전트 목록 조회 실패:', err);
        res.status(500).json({ error: '에이전트 목록 조회 실패' });
    }
});

module.exports = router;