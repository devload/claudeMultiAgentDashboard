#!/bin/bash

# Redis 기반 Agent 간 통신
source "$(dirname "$0")/redis-helper.sh"

# 사용법 확인
if [ $# -lt 2 ]; then
    echo "Usage: $0 <target-agent> <message> [from-agent]"
    echo "Example: $0 builder 'Build the project' commander"
    exit 1
fi

TARGET=$1
MESSAGE=$2
FROM=${3:-"user"}

# 메시지 포맷
if [ "$FROM" != "user" ]; then
    FULL_MESSAGE="[From: $FROM] $MESSAGE"
else
    FULL_MESSAGE="$MESSAGE"
fi

# Redis에 작업 추가
redis_push_task "$TARGET" "$FULL_MESSAGE"

# 이벤트 발행
EVENT_JSON=$(cat <<EOF
{
    "from": "$FROM",
    "to": "$TARGET",
    "message": "$MESSAGE",
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")"
}
EOF
)
redis_publish "channel:messages" "$EVENT_JSON"

# 성공 메시지
echo "Message sent to $TARGET via Redis"
echo "Queue size: $($REDIS_CLI LLEN "tasks:$TARGET")"

# 옵션: 실시간 응답 대기
if [ "${WAIT_RESPONSE:-0}" = "1" ]; then
    echo "Waiting for response..."
    redis_subscribe "channel:logs" "grep -E \"\\[$TARGET\\]\""
fi