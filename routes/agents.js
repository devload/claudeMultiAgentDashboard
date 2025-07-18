const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

const REGISTRY_DIR = path.join(__dirname, "..", "registry");

// 모든 에이전트 목록 조회
router.get("/", (req, res) => {
    try {
        // registry 디렉토리의 모든 .json 파일 읽기
        const files = fs.readdirSync(REGISTRY_DIR);
        const agents = [];
        
        files.forEach(file => {
            if (file.endsWith('.json')) {
                try {
                    const agentData = JSON.parse(
                        fs.readFileSync(path.join(REGISTRY_DIR, file), 'utf-8')
                    );
                    agents.push({
                        name: agentData.name,
                        role: agentData.role,
                        status: agentData.status,
                        started: agentData.started
                    });
                } catch (e) {
                    console.warn(`Failed to parse ${file}:`, e);
                }
            }
        });
        
        // 이름순으로 정렬
        agents.sort((a, b) => a.name.localeCompare(b.name));
        
        res.json(agents);
    } catch (err) {
        console.error('에이전트 목록 조회 실패:', err);
        res.status(500).json({ error: '에이전트 목록 조회 실패' });
    }
});

module.exports = router;