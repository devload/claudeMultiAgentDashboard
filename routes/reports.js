const express = require("express");
const router = express.Router();
const redis = require("../utils/redis");
const fs = require("fs");
const path = require("path");

// 최종 리포트를 사용자에게 전달
router.post("/submit", async (req, res) => {
    const { agent, reportPath, summary } = req.body;
    
    try {
        // Redis에 리포트 정보 저장
        const reportId = Date.now();
        await redis.hset(`report:${reportId}`, {
            agent,
            path: reportPath,
            summary,
            timestamp: new Date().toISOString(),
            status: "submitted"
        });
        
        // 사용자에게 알림 (WebSocket으로 브로드캐스트)
        if (global.broadcastReport) {
            global.broadcastReport({
                id: reportId,
                agent,
                summary,
                path: reportPath,
                timestamp: new Date().toISOString()
            });
        }
        
        res.json({ 
            success: true, 
            reportId,
            message: "리포트가 제출되었습니다" 
        });
    } catch (error) {
        console.error("리포트 제출 실패:", error);
        res.status(500).json({ error: "리포트 제출 실패" });
    }
});

// 리포트 목록 조회
router.get("/list", async (req, res) => {
    try {
        const reportKeys = await redis.keys("report:*");
        const reports = [];
        
        for (const key of reportKeys) {
            const report = await redis.hgetall(key);
            if (report) {
                reports.push({
                    id: key.split(":")[1],
                    ...report
                });
            }
        }
        
        // 최신순 정렬
        reports.sort((a, b) => b.id - a.id);
        
        res.json(reports);
    } catch (error) {
        console.error("리포트 목록 조회 실패:", error);
        res.status(500).json({ error: "리포트 목록 조회 실패" });
    }
});

// 리포트 내용 읽기
router.get("/read/:id", async (req, res) => {
    try {
        const report = await redis.hgetall(`report:${req.params.id}`);
        
        if (!report || !report.path) {
            return res.status(404).json({ error: "리포트를 찾을 수 없습니다" });
        }
        
        // 파일 읽기
        const content = fs.readFileSync(report.path, "utf-8");
        
        res.json({
            ...report,
            content
        });
    } catch (error) {
        console.error("리포트 읽기 실패:", error);
        res.status(500).json({ error: "리포트 읽기 실패" });
    }
});

module.exports = router;