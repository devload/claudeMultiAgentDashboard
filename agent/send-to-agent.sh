#!/bin/bash
# 사용법: ./send-to-agent.sh <대상에이전트> "명령"

if [ $# -lt 2 ]; then
    echo "사용법: $0 <agent-name> \"command\""
    echo "예시: $0 commander \"파일 목록을 보여줘\""
    echo "가능한 에이전트: builder, commander, tester"
    exit 1
fi

AGENT=$1
COMMAND=$2
TODO_FILE="/Users/rohsunghyun/claudeAuto/tasks/${AGENT}.todo"

echo "$COMMAND" > "$TODO_FILE"
echo "📤 ${AGENT}에게 전송: $COMMAND"
echo "📁 작업 파일: $TODO_FILE"