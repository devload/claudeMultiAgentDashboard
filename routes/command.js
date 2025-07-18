const fs = require("fs");
const path = require("path");
const express = require("express");
const router = express.Router();

// 전역 broadcast 함수 사용
const broadcastCommand = (...args) => global.broadcastCommand && global.broadcastCommand(...args);
const broadcastLog = (...args) => global.broadcastLog && global.broadcastLog(...args);

function loadAgentConfig(agentName) {
    const configPath = path.join(__dirname, "..", "registry", `${agentName}.json`);
    if (!fs.existsSync(configPath)) throw new Error(`⚠️ 설정 파일 없음: ${agentName}`);
    return JSON.parse(fs.readFileSync(configPath, "utf-8"));
}

router.post("/", (req, res) => {
    const { agent, prompt, sender } = req.body;
    if (!agent || !prompt) return res.status(400).json({ error: "agent and prompt required" });

    try {
        const config = loadAgentConfig(agent);
        const ROOT_DIR = config.root_dir || "/Users/rohsunghyun/claudeAuto";
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
        
        // 발신자 정보가 있으면 명령어에 포함
        const finalPrompt = sender ? `[From: ${sender}] ${prompt}` : prompt;
        
        fs.writeFile(taskFile, finalPrompt, (err) => {
            if (err) return res.status(500).json({ error: err.message });

            const msg = `[${new Date().toISOString()}] ${agent} 명령 수신: ${prompt}`;
            
            // 로그 브로드캐스트
            if (broadcastLog) broadcastLog(agent, msg);
            
            // 명령어 브로드캐스트는 server.js의 .todo 파일 감지에서 처리
            // 여기서는 제거하여 중복 방지
            
            res.json({ message: "✅ 명령 전달됨" });
        });
    } catch (e) {
        res.status(404).json({ error: e.message });
    }
});

module.exports = router;
