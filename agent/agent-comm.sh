#!/bin/bash
# 에이전트 간 통신 도구

CLAUDE_DIR="/Users/rohsunghyun/claudeAuto"
SENDER=$(jq -r .name "$CLAUDE_DIR/agent/agent.json" 2>/dev/null || echo "unknown")

case "$1" in
    send)
        if [ $# -lt 3 ]; then
            echo "사용법: $0 send <agent> \"message\""
            exit 1
        fi
        TARGET=$2
        MESSAGE=$3
        echo "[From: $SENDER] $MESSAGE" > "$CLAUDE_DIR/tasks/${TARGET}.todo"
        echo "✅ $SENDER → $TARGET: $MESSAGE"
        ;;
    
    direct)
        # 발신자 정보 없이 직접 전송
        TARGET=$2
        MESSAGE=$3
        echo "$MESSAGE" > "$CLAUDE_DIR/tasks/${TARGET}.todo"
        echo "📤 $TARGET에게 직접 전송: $MESSAGE"
        ;;
    
    broadcast)
        MESSAGE=$2
        for agent in builder commander tester; do
            if [ "$agent" != "$SENDER" ]; then
                echo "[Broadcast from $SENDER] $MESSAGE" > "$CLAUDE_DIR/tasks/${agent}.todo"
            fi
        done
        echo "📢 모든 에이전트에게 브로드캐스트 완료"
        ;;
    
    status)
        echo "📊 에이전트 상태:"
        for agent in builder commander tester; do
            TODO="$CLAUDE_DIR/tasks/${agent}.todo"
            if [ -f "$TODO" ]; then
                echo "  - $agent: 🟡 작업 대기 중"
            else
                echo "  - $agent: ✅ 대기 중"
            fi
        done
        ;;
    
    *)
        echo "사용법:"
        echo "  $0 send <agent> \"message\"  - 특정 에이전트에게 전송"
        echo "  $0 direct <agent> \"message\" - 직접 전송 (발신자 정보 없이)"
        echo "  $0 broadcast \"message\"      - 모든 에이전트에게 전송"
        echo "  $0 status                   - 모든 에이전트 상태 확인"
        ;;
esac