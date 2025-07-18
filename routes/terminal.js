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
            
            // 기본 터미널 앱으로 tmux 세션 열기
            // AppleScript를 사용하여 Terminal.app에서 명령 실행
            const appleScript = `
                tell application "Terminal"
                    activate
                    do script "tmux attach -t ${sessionName}"
                end tell
            `;
            
            const command = `osascript -e '${appleScript.trim().replace(/'/g, "'\"'\"'")}'`;
            
            console.log("Executing command for terminal activation");
        
            exec(command, (error2, stdout, stderr) => {
                if (error2) {
                    console.error("터미널 활성화 실패:", error2);
                    console.error("stderr:", stderr);
                    
                    // iTerm2가 없으면 기본 터미널 사용
                    const fallbackCommand = `open -a Terminal -n`;
                    exec(fallbackCommand, (error3) => {
                        if (error3) {
                            return res.status(500).json({ 
                                error: "터미널 활성화 실패", 
                                details: error2.message,
                                stderr: stderr 
                            });
                        }
                        // 터미널은 열렸지만 tmux attach는 수동으로 해야 함
                        res.json({ 
                            success: true, 
                            agent: agent,
                            session: sessionName,
                            info: agentInfo,
                            note: `터미널이 열렸습니다. 'tmux attach -t ${sessionName}' 명령을 직접 입력해주세요.`
                        });
                    });
                    return;
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