const express = require("express");
const router = express.Router();
const { broadcastLog } = require("../utils/ws");
const redis = require("../utils/redis");

router.get("/:agent", async (req, res) => {
    const agent = req.params.agent;
    
    try {
        // Redis에서 에이전트 설정 조회
        const config = await redis.hgetall(`agent:${agent}:config`);
        
        if (!config || Object.keys(config).length === 0) {
            return res.status(404).json({ error: "설정 없음" });
        }
        
        // 숫자 타입 변환 처리
        const parsedConfig = {};
        for (const [key, value] of Object.entries(config)) {
            try {
                parsedConfig[key] = JSON.parse(value);
            } catch {
                parsedConfig[key] = value;
            }
        }
        
        res.json(parsedConfig);
    } catch (e) {
        res.status(500).json({ error: `⚠️ 설정 조회 실패: ${e.message}` });
    }
});

router.post("/:agent", async (req, res) => {
    const agent = req.params.agent;

    try {
        // Redis에 설정 저장
        const config = req.body;
        const configToStore = {};
        
        // 각 필드를 문자열로 변환하여 저장
        for (const [key, value] of Object.entries(config)) {
            configToStore[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
        }
        
        await redis.hmset(`agent:${agent}:config`, configToStore);
        
        // 변경 사항 방송
        broadcastLog(agent, `🛠️ 설정 변경됨 (${agent})`);
        await redis.publish('config:changes', JSON.stringify({ agent, config }));
        
        res.json({ message: "✅ 설정 저장 완료" });
    } catch (e) {
        res.status(500).json({ error: `⚠️ 저장 실패: ${e.message}` });
    }
});

module.exports = router;
