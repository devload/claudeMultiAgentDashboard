const express = require("express");
const { exec } = require("child_process");
const router = express.Router();
const redis = require("../utils/redis");

// 특정 에이전트의 터미널 활성화
router.post("/activate/:agent", async (req, res) => {
    const agent = req.params.agent;
    
    try {
        // Redis에서 에이전트 정보 조회
        const agentInfo = await redis.hgetall(`agent:${agent}:info`);
        
        if (!agentInfo || !agentInfo.name) {
            return res.status(404).json({ error: "에이전트를 찾을 수 없습니다" });
        }
        
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
            
            // open 명령어로 새 터미널 창 열기 (더 간단한 방법)
            const command = `open -a iTerm2 -n --args -e "tmux attach -t ${sessionName}"`;
            
            console.log("Executing command for terminal activation:", command);
        
            exec(command, (error2, stdout, stderr) => {
                if (error2) {
                    console.error("터미널 활성화 실패:", error2);
                    console.error("stderr:", stderr);
                    return res.status(500).json({ 
                        error: "터미널 활성화 실패", 
                        details: error2.message,
                        stderr: stderr 
                    });
                }
                
                console.log("AppleScript executed successfully");
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
router.get("/info", async (req, res) => {
    const agents = ["builder", "commander", "tester"];
    const terminalInfo = {};
    
    for (const agent of agents) {
        try {
            const agentData = await redis.hgetall(`agent:${agent}:info`);
            if (agentData && agentData.name) {
                terminalInfo[agent] = agentData;
            }
        } catch (e) {
            terminalInfo[agent] = { error: "정보 로드 실패" };
        }
    }
    
    res.json(terminalInfo);
});

module.exports = router;