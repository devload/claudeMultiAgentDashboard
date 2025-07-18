const fs = require("fs");
const path = require("path");
const express = require("express");
const router = express.Router();
const { taskQueue, commandHistory, utils } = require('../utils/redis');

// 전역 broadcast 함수 사용
const broadcastCommand = (...args) => global.broadcastCommand && global.broadcastCommand(...args);
const broadcastLog = (...args) => global.broadcastLog && global.broadcastLog(...args);

async function loadAgentConfig(agentName) {
    const redis = require('../utils/redis');
    
    // Redis에서 에이전트 정보 조회
    const agentInfo = await redis.hgetall(`agent:${agentName}:info`);
    
    if (!agentInfo || !agentInfo.name) {
        throw new Error(`⚠️ 에이전트를 찾을 수 없음: ${agentName}`);
    }
    
    // 필요한 설정 정보 반환
    return {
        name: agentInfo.name,
        role: agentInfo.role,
        root_dir: "/Users/devload/claueAI"  // 기본값 사용
    };
}

router.post("/", async (req, res) => {
    const { agent, prompt, sender } = req.body;
    if (!agent || !prompt) return res.status(400).json({ error: "agent and prompt required" });

    try {
        const config = await loadAgentConfig(agent);
        const ROOT_DIR = config.root_dir || "/Users/rohsunghyun/claudeAuto";
        
        // 발신자 정보를 항상 포함 (없으면 'user'로 표시)
        const finalPrompt = `[From: ${sender || 'user'}] ${prompt}`;
        
        // Redis 사용 여부 확인
        if (utils.isConnected()) {
            // Redis 모드
            const success = await taskQueue.push(agent, finalPrompt);
            
            if (success) {
                // 명령어 히스토리 저장
                await commandHistory.add(agent, prompt, sender || 'user');
                
                const msg = `[${new Date().toISOString()}] ${agent} 명령 수신: ${prompt}`;
                if (broadcastLog) broadcastLog(agent, msg);
                
                res.json({ message: "✅ 명령 전달됨 (Redis)" });
            } else {
                res.status(500).json({ error: "Redis 작업 큐 오류" });
            }
        } else {
            // 파일 시스템 폴백 모드
            const taskDir = path.join(ROOT_DIR, "tasks");
            const taskFile = path.join(taskDir, `${agent}.todo`);
            const commandDir = path.join(ROOT_DIR, "commands");
            const commandFile = path.join(commandDir, `${agent}-${Date.now()}.cmd`);

            fs.mkdirSync(taskDir, { recursive: true });
            fs.mkdirSync(commandDir, { recursive: true });
            
            // 명령어 파일 저장 (히스토리용)
            fs.writeFileSync(commandFile, JSON.stringify({
                agent,
                prompt,
                timestamp: new Date().toISOString()
            }, null, 2));
            
            fs.writeFile(taskFile, finalPrompt, (err) => {
                if (err) return res.status(500).json({ error: err.message });

                const msg = `[${new Date().toISOString()}] ${agent} 명령 수신: ${prompt}`;
                if (broadcastLog) broadcastLog(agent, msg);
                
                res.json({ message: "✅ 명령 전달됨 (File)" });
            });
        }
    } catch (e) {
        res.status(404).json({ error: e.message });
    }
});

module.exports = router;
