const http = require("http");
const WebSocket = require("ws");
const chokidar = require("chokidar");
const fs = require("fs");
const path = require("path");
const { initRedis, pubsub, taskQueue, logStream, agentStatus, utils } = require('./utils/redis');

const app = require("./app");
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const LOGS_DIR = path.join(__dirname, "logs");
const TASKS_DIR = path.join(__dirname, "tasks");
const COMMANDS_DIR = path.join(__dirname, "commands");
const clients = {}; // agent별 연결된 클라이언트 목록
const commandHistory = {}; // agent별 명령어 히스토리

// 명령어 디렉토리 생성
fs.mkdirSync(COMMANDS_DIR, { recursive: true });

// WebSocket 연결 관리
wss.on("connection", (ws) => {
    let agent = null;

    ws.on("message", (msg) => {
        try {
            const data = JSON.parse(msg);
            if (data.type === "subscribe" && data.agent) {
                agent = data.agent;
                if (!clients[agent]) clients[agent] = [];
                clients[agent].push(ws);
                console.log(`🔔 WebSocket 구독: ${agent}, 총 연결수: ${clients[agent].length}`);
            }
        } catch (e) {
            console.warn("⚠️ WS 메시지 파싱 실패:", e.message);
        }
    });

    ws.on("close", () => {
        if (agent && clients[agent]) {
            clients[agent] = clients[agent].filter((c) => c !== ws);
        }
    });
});

// 로그 실시간 전송
function broadcastLog(agent, content) {
    const conns = clients[agent] || [];
    console.log(`📢 broadcastLog 호출: agent=${agent}, 연결된 클라이언트=${conns.length}, 내용길이=${content.length}`);
    
    for (const ws of conns) {
        if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: "log", agent, content }));
            console.log(`✅ 로그 전송됨: ${agent}`);
        }
    }
}

// todo 상태 실시간 전송
function broadcastTodoStatus(agent, pending) {
    const conns = clients[agent] || [];
    const msg = JSON.stringify({ type: "todo", agent, pending });
    for (const ws of conns) {
        if (ws.readyState === ws.OPEN) {
            ws.send(msg);
        }
    }
}

// 명령어 실시간 전송
function broadcastCommand(agent, command) {
    const conns = clients[agent] || [];
    const timestamp = new Date().toISOString();
    
    console.log(`📤 broadcastCommand 호출: agent=${agent}, command=${command}, 연결된 클라이언트=${conns.length}`);
    
    // 명령어 히스토리에 추가
    if (!commandHistory[agent]) commandHistory[agent] = [];
    commandHistory[agent].unshift({ command, timestamp });
    if (commandHistory[agent].length > 50) commandHistory[agent].pop(); // 최대 50개 유지
    
    const msg = JSON.stringify({ 
        type: "command", 
        agent, 
        command, 
        timestamp,
        history: commandHistory[agent].slice(0, 10) // 최근 10개만 전송
    });
    
    for (const ws of conns) {
        if (ws.readyState === ws.OPEN) {
            ws.send(msg);
            console.log(`✅ WebSocket 메시지 전송됨: ${agent}`);
        }
    }
}

// 에이전트 상태 변경 알림 (추가/제거)
function broadcastAgentChange(action, agentName) {
    console.log(`📢 broadcastAgentChange 호출: action=${action}, agent=${agentName}`);
    
    // 모든 연결된 클라이언트에게 알림
    for (const [agent, conns] of Object.entries(clients)) {
        for (const ws of conns) {
            if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({ 
                    type: "agentChange", 
                    action, // 'added' or 'removed'
                    agentName 
                }));
            }
        }
    }
}

// broadcast 함수들을 전역으로 내보내기
global.broadcastCommand = broadcastCommand;
global.broadcastLog = broadcastLog;
global.broadcastAgentChange = broadcastAgentChange;

// 각 에이전트별 마지막 로그 내용 추적
const lastLogContents = {};

// 로그 파일 변경 감지 - 폴링 방식 사용
const logWatcher = chokidar.watch(path.join(LOGS_DIR, '*-latest.log'), {
    persistent: true,
    ignoreInitial: true,
    usePolling: true,  // 폴링 사용
    interval: 2000,     // 2초마다 체크
    binaryInterval: 2000,
    awaitWriteFinish: false,  // 쓰기 완료 대기 비활성화
    alwaysStat: true,   // 항상 stat 정보 확인
    depth: 0
});

// change와 add 이벤트 모두 감지
logWatcher
.on("change", (filePath) => {
    const file = path.basename(filePath); // 예: builder-latest.log
    console.log(`📂 파일 변경 감지: ${file}`);
    
    // -latest.log 파일만 감시
    if (!file.endsWith('-latest.log')) {
        console.log(`❌ -latest.log가 아니므로 무시: ${file}`);
        return;
    }
    
    const agent = file.split("-")[0];
    if (!agent) return;
    console.log(`📝 에이전트 파일 변경: ${agent}`);

    try {
        // 항상 전체 내용을 읽기
        const currentContent = fs.readFileSync(filePath, 'utf-8');
        const lastContent = lastLogContents[filePath] || '';
        
        // 내용이 변경되었는지 확인
        if (currentContent !== lastContent) {
            console.log(`📄 로그 변경 감지: 이전 길이=${lastContent.length}, 현재 길이=${currentContent.length}`);
            
            // 새로운 내용만 추출
            if (currentContent.startsWith(lastContent)) {
                // 기존 내용 뒤에 추가된 경우
                const newContent = currentContent.slice(lastContent.length);
                if (newContent.trim()) {
                    console.log(`➕ 새로운 내용: ${newContent.length}자`);
                    broadcastLog(agent, newContent);
                }
            } else {
                // 파일이 완전히 교체된 경우
                console.log(`🔄 파일 교체됨`);
                if (currentContent.trim()) {
                    broadcastLog(agent, currentContent);
                }
            }
            
            lastLogContents[filePath] = currentContent;
        }
    } catch (e) {
        console.warn("❌ 로그 읽기 실패:", e.message);
    }
})
.on("add", (filePath) => {
    // 새 파일이 추가된 경우도 처리
    const file = path.basename(filePath);
    console.log(`📂 새 파일 감지: ${file}`);
    
    if (!file.endsWith('-latest.log')) return;
    
    const agent = file.split("-")[0];
    if (!agent) return;
    
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        if (content.trim()) {
            lastLogContents[filePath] = content;
            broadcastLog(agent, content);
        }
    } catch (e) {
        console.warn("❌ 새 로그 읽기 실패:", e.message);
    }
});

// .todo 파일 상태 감지
chokidar.watch(TASKS_DIR, {
    ignoreInitial: false,
    usePolling: true,
    interval: 1000,
    awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100
    }
})
    .on("add", (filePath) => {
        const filename = path.basename(filePath);
        // .todo 파일만 처리
        if (!filename.endsWith('.todo')) return;
        
        const agent = filename.replace('.todo', '');
        if (!agent) return;
        
        broadcastTodoStatus(agent, true); // 🟡 대기 중
        
        // 파일 쓰기가 완료될 때까지 잠시 대기
        setTimeout(() => {
            try {
                const command = fs.readFileSync(filePath, "utf-8").trim();
                if (command) {
                    console.log(`📝 [${agent}] 명령어 감지: ${command}`);
                    console.log(`📝 파일 경로: ${filePath}`);
                    
                    // [From: xxx] 패턴 감지
                    const fromMatch = command.match(/^\[From: (\w+)\]\s*(.+)/);
                    if (fromMatch) {
                        const sender = fromMatch[1];
                        const actualCommand = fromMatch[2];
                        // 웹에서 보낸 경우 특별 처리
                        if (sender === 'web') {
                            broadcastCommand(agent, actualCommand);
                        } else {
                            broadcastCommand(agent, `📥 ${sender} → ${agent}: ${actualCommand}`);
                        }
                    } else {
                        // 일반 명령에서도 패턴 감지
                        // 예: "echo '명령' > /path/to/tasks/commander.todo" 패턴
                        const echoMatch = command.match(/echo\s+['"](.+?)['"]\s*>\s*.*\/tasks\/(\w+)\.todo/);
                        if (echoMatch) {
                            const targetAgent = echoMatch[2];
                            const targetCommand = echoMatch[1];
                            // 현재 파일의 agent가 다른 agent에게 보내는 경우
                            if (targetAgent !== agent) {
                                // 실제로는 builder가 명령을 실행하는 것이므로 builder가 발신자
                                broadcastCommand(agent, `📤 ${agent} → ${targetAgent}: ${command}`);
                            } else {
                                broadcastCommand(agent, command);
                            }
                        } else if (command.includes('./send-to-agent.sh') || command.includes('./agent-comm.sh')) {
                            // send-to-agent.sh commander "명령" 패턴
                            const sendMatch = command.match(/\.(\/send-to-agent\.sh|\/agent-comm\.sh\s+send)\s+(\w+)\s+["'](.+?)['"]/);
                            if (sendMatch) {
                                const targetAgent = sendMatch[2];
                                const targetCommand = sendMatch[3];
                                broadcastCommand(agent, `📤 ${agent} → ${targetAgent}: ${command}`);
                            } else {
                                broadcastCommand(agent, command);
                            }
                        } else {
                            broadcastCommand(agent, command);
                        }
                    }
                }
            } catch (err) {
                console.warn("Todo 파일 읽기 실패:", err);
            }
        }, 200); // 200ms 대기
    })
    .on("unlink", (filePath) => {
        const agent = path.basename(filePath).split(".")[0];
        broadcastTodoStatus(agent, false); // ✅ 완료됨
    });

// 백업: 5초마다 수동으로 로그 파일 체크
setInterval(() => {
    fs.readdir(LOGS_DIR, (err, files) => {
        if (err) return;
        
        files.filter(f => f.endsWith('-latest.log')).forEach(file => {
            const filePath = path.join(LOGS_DIR, file);
            const agent = file.split('-')[0];
            
            try {
                const currentContent = fs.readFileSync(filePath, 'utf-8');
                const lastContent = lastLogContents[filePath] || '';
                
                if (currentContent !== lastContent && currentContent.trim()) {
                    console.log(`⏰ 정기 체크에서 변경 감지: ${file}`);
                    
                    if (currentContent.startsWith(lastContent)) {
                        const newContent = currentContent.slice(lastContent.length);
                        if (newContent.trim()) {
                            broadcastLog(agent, newContent);
                        }
                    } else {
                        broadcastLog(agent, currentContent);
                    }
                    
                    lastLogContents[filePath] = currentContent;
                }
            } catch (e) {
                // 조용히 실패
            }
        });
    });
}, 5000);

// Redis 초기화 및 Pub/Sub 설정
(async () => {
    const redisConnected = await initRedis();
    
    if (redisConnected) {
        console.log('🚀 Redis 모드로 실행중');
        
        // Redis Pub/Sub 구독
        await pubsub.subscribe(['channel:tasks', 'channel:logs', 'channel:status'], (channel, data) => {
            console.log(`📡 Redis 이벤트 수신 - 채널: ${channel}`);
            
            switch (channel) {
                case 'channel:tasks':
                    if (data.type === 'task_added') {
                        // 작업 추가 알림
                        broadcastTodoStatus(data.agent, true);
                        broadcastCommand(data.agent, data.task);
                    } else if (data.type === 'task_completed') {
                        // 작업 완료 알림
                        broadcastTodoStatus(data.agent, false);
                    }
                    break;
                    
                case 'channel:logs':
                    if (data.type === 'log_added') {
                        // 로그 추가 알림
                        broadcastLog(data.agent, data.message);
                    }
                    break;
                    
                case 'channel:status':
                    if (data.type === 'status_update') {
                        // 상태 업데이트 처리 (필요시)
                        console.log(`상태 업데이트: ${data.agent} - ${data.status}`);
                    }
                    break;
            }
        });
        
        // Redis 로그 스트림 폴링 (실시간 로그용)
        setInterval(async () => {
            const agents = await taskQueue.list('builder').then(() => ['builder', 'commander']);
            
            for (const agent of agents) {
                const lastLogId = global.lastLogIds?.[agent] || '0';
                const newLogs = await logStream.readSince(agent, lastLogId);
                
                if (newLogs.length > 0) {
                    const lastLog = newLogs[newLogs.length - 1];
                    if (!global.lastLogIds) global.lastLogIds = {};
                    global.lastLogIds[agent] = lastLog.id;
                    
                    // 새 로그들을 브로드캐스트
                    const content = newLogs.map(log => log.message).join('\n');
                    if (content.trim()) {
                        broadcastLog(agent, content);
                    }
                }
            }
        }, 1000); // 1초마다 체크
        
    } else {
        console.log('📁 파일 시스템 모드로 실행중');
    }
})();

// 서버 모듈 내보내기 (bin/www에서 실행)
module.exports = server;
