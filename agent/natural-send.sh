#!/bin/bash
# 자연어로 다른 에이전트에게 명령 전달

INPUT="$*"
CLAUDE_DIR="/Users/rohsunghyun/claudeAuto"
SENDER=$(jq -r .name "$CLAUDE_DIR/agent/agent.json" 2>/dev/null || echo "unknown")

# "X한테/에게 Y" 패턴 매칭
if [[ $INPUT =~ (commander|builder|tester)(한테|에게)\s+(.+) ]]; then
    AGENT="${BASH_REMATCH[1]}"
    MESSAGE="${BASH_REMATCH[3]}"
    
    # 따옴표 제거
    MESSAGE=$(echo "$MESSAGE" | sed 's/^["'\''"]//;s/["'\''"]$//')
    
    echo "[From: $SENDER] $MESSAGE" > "$CLAUDE_DIR/tasks/${AGENT}.todo"
    echo "✅ $SENDER → $AGENT: $MESSAGE"
else
    echo "❌ 형식: natural-send.sh 에이전트한테 메시지"
    echo "예시: natural-send.sh 커맨더한테 현재 디렉토리의 파일을 보여줘"
fi