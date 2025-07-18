const express = require("express");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const router = express.Router();

// 특정 에이전트의 터미널 활성화
router.post("/activate/:agent", (req, res) => {
    const agent = req.params.agent;
    const registryFile = path.join(__dirname, "..", "registry", `${agent}.json`);
    
    if (!fs.existsSync(registryFile)) {
        return res.status(404).json({ error: "에이전트를 찾을 수 없습니다" });
    }
    
    try {
        const agentInfo = JSON.parse(fs.readFileSync(registryFile, "utf-8"));
        
        // tmux 세션 확인 및 iTerm2에서 열기
        const sessionName = `agent-${agent}`;
        
        // 먼저 tmux 세션이 존재하는지 확인
        exec(`tmux has-session -t ${sessionName} 2>/dev/null`, (error) => {
            if (error) {
                // 세션이 없으면 에러
                return res.status(404).json({ 
                    error: "tmux 세션을 찾을 수 없습니다",
                    hint: `start-agent-tmux.sh를 실행하여 ${agent} 에이전트를 시작하세요`
                });
            }
            
            // AppleScript로 iTerm2에서 tmux 세션 열기
            const script = `
                tell application "iTerm2"
                    activate
                    create window with default profile
                    tell current session of current window
                        write text "tmux attach -t ${sessionName}"
                    end tell
                end tell
            `;
        
            exec(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`, (error2, stdout, stderr) => {
                if (error2) {
                    console.error("터미널 활성화 실패:", error2);
                    return res.status(500).json({ error: "터미널 활성화 실패" });
                }
                
                res.json({ 
                    success: true, 
                    agent: agent,
                    session: sessionName,
                    info: agentInfo
                });
            });
        });
        
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 모든 에이전트의 터미널 정보 조회
router.get("/info", (req, res) => {
    const agents = ["builder", "commander", "tester"];
    const terminalInfo = {};
    
    agents.forEach(agent => {
        const registryFile = path.join(__dirname, "..", "registry", `${agent}.json`);
        if (fs.existsSync(registryFile)) {
            try {
                terminalInfo[agent] = JSON.parse(fs.readFileSync(registryFile, "utf-8"));
            } catch (e) {
                terminalInfo[agent] = { error: "정보 로드 실패" };
            }
        }
    });
    
    res.json(terminalInfo);
});

module.exports = router;