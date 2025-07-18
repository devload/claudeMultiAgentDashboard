const express = require('express');
const router = express.Router();
const redis = require('../utils/redis');

router.get('/agents', async (req, res) => {
    try {
        const agentKeys = await redis.keys('agent:*:info');
        const agents = [];
        
        for (const key of agentKeys) {
            const agentData = await redis.hgetall(key);
            if (agentData && agentData.name) {
                agents.push(agentData);
            }
        }
        
        res.json(agents);
    } catch (err) {
        console.error('Error fetching agents:', err);
        res.status(500).json({ error: 'Failed to fetch agents' });
    }
});

router.get('/logs/:agent', async (req, res) => {
    try {
        const agent = req.params.agent;
        // Redis에서 최근 로그 조회 (나중에 STREAM으로 마이그레이션 예정)
        const logs = await redis.lrange(`logs:${agent}`, -100, -1); // 최근 100개 로그
        
        if (!logs || logs.length === 0) {
            return res.status(404).send('No logs');
        }
        
        res.type('text/plain').send(logs.join('\n'));
    } catch (err) {
        console.error('Error fetching logs:', err);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

module.exports = router; // ← 이거 꼭 있어야 함!
