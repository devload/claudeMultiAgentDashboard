const fs = require("fs");
const path = require("path");
const express = require("express");
const router = express.Router();
const { broadcastLog } = require("../utils/ws");

const ROOT_DIR = "/Users/rohsunghyun/claudeAuto";

function getAgentConfigPath(agentName) {
    return path.join(ROOT_DIR, "registry", `${agentName}.json`);
}

router.get("/:agent", (req, res) => {
    const filePath = getAgentConfigPath(req.params.agent);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "설정 없음" });

    try {
        const json = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        res.json(json);
    } catch (e) {
        res.status(500).json({ error: `⚠️ JSON 파싱 실패: ${e.message}` });
    }
});

router.post("/:agent", (req, res) => {
    const filePath = getAgentConfigPath(req.params.agent);

    try {
        fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2), "utf-8");
        broadcastLog(req.params.agent, `🛠️ 설정 변경됨 (${req.params.agent})`);
        res.json({ message: "✅ 설정 저장 완료" });
    } catch (e) {
        res.status(500).json({ error: `⚠️ 저장 실패: ${e.message}` });
    }
});

module.exports = router;
