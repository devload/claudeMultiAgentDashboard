#!/bin/bash
# tmux 세션으로 에이전트 시작하는 스크립트

AGENT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$AGENT_DIR" || exit 1

# agent.json에서 정보 읽기
if [[ -f "$AGENT_DIR/agent.json" ]]; then
  NAME=$(jq -r .name "$AGENT_DIR/agent.json")
else
  echo "❌ agent.json 파일이 필요합니다"
  exit 1
fi

SESSION_NAME="agent-$NAME"

# 기존 세션이 있는지 확인
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  echo "⚠️  이미 실행 중인 세션이 있습니다: $SESSION_NAME"
  echo "재접속하려면: tmux attach -t $SESSION_NAME"
  echo "종료하려면: tmux kill-session -t $SESSION_NAME"
  exit 1
fi

# 새 tmux 세션 시작
echo "🚀 tmux 세션 시작: $SESSION_NAME"
tmux new-session -d -s "$SESSION_NAME" "$AGENT_DIR/agent-loop.sh"

echo "✅ 에이전트가 tmux 세션에서 시작되었습니다"
echo ""
echo "📌 유용한 명령어:"
echo "  접속: tmux attach -t $SESSION_NAME"
echo "  목록: tmux ls"
echo "  종료: tmux kill-session -t $SESSION_NAME"