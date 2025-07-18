const express = require("express");
const router = express.Router();

// 전역 broadcast 함수 사용
const broadcastAgentChange = (...args) => global.broadcastAgentChange && global.broadcastAgentChange(...args);

// POST /api/agent-change
// Called by manage-agent.sh script to notify when agents are added/removed
router.post("/", (req, res) => {
    const { action, agentName } = req.body;
    
    // Validate input
    if (!action || !agentName) {
        return res.status(400).json({ 
            error: "Missing required fields: action and agentName" 
        });
    }
    
    // Validate action type
    if (!['added', 'removed'].includes(action)) {
        return res.status(400).json({ 
            error: "Invalid action. Must be 'added' or 'removed'" 
        });
    }
    
    console.log(`🔔 Agent change notification: ${action} - ${agentName}`);
    
    // Broadcast the change to all connected clients
    try {
        broadcastAgentChange(action, agentName);
        res.json({ 
            success: true, 
            message: `Agent ${agentName} ${action} notification sent` 
        });
    } catch (error) {
        console.error(`❌ Error broadcasting agent change: ${error.message}`);
        res.status(500).json({ 
            error: "Failed to broadcast agent change",
            details: error.message
        });
    }
});

module.exports = router;