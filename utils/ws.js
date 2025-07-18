// utils/ws.js
const clients = {}; // agent별 WebSocket 리스트

function registerClient(agent, ws) {
    if (!clients[agent]) clients[agent] = [];
    clients[agent].push(ws);
}

function unregisterClient(agent, ws) {
    if (clients[agent]) {
        clients[agent] = clients[agent].filter(c => c !== ws);
    }
}

function broadcastLog(agent, content) {
    const conns = clients[agent] || [];
    for (const ws of conns) {
        if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: "log", content }));
        }
    }
}

module.exports = {
    clients,
    registerClient,
    unregisterClient,
    broadcastLog
};
