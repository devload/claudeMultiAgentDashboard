#!/bin/bash

# Redis 기반 Agent Loop
source "$(dirname "$0")/redis-helper.sh"

# Agent 설정
NAME="${1:-builder}"
CLAUDE_CMD="claude-3-5-sonnet-20241022"
LOG_DIR="../logs"
REGISTRY_DIR="../registry"

# 로그 디렉토리 생성
mkdir -p "$LOG_DIR" "$REGISTRY_DIR"

# Agent 등록
CONFIG=$(cat <<EOF
{
    "name": "$NAME",
    "status": "active",
    "capabilities": ["build", "test", "deploy"],
    "created": "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")"
}
EOF
)
redis_register_agent "$NAME" "$CONFIG"

# 시작 로그
redis_add_log "$NAME" "Agent $NAME started (PID: $$)"
redis_publish "channel:status" "{\"agent\":\"$NAME\",\"status\":\"started\",\"pid\":$$}"

# 정리 함수
cleanup() {
    redis_update_status "$NAME" "stopped"
    redis_add_log "$NAME" "Agent $NAME stopped"
    redis_publish "channel:status" "{\"agent\":\"$NAME\",\"status\":\"stopped\"}"
    exit 0
}

trap cleanup EXIT INT TERM

# 메인 루프
while true; do
    redis_update_status "$NAME" "waiting"
    
    # 작업 대기 (블로킹)
    echo "[$NAME] Waiting for tasks..."
    TASK=$(redis_get_task "$NAME")
    
    if [ -n "$TASK" ]; then
        redis_update_status "$NAME" "processing"
        redis_add_log "$NAME" "Processing task: $TASK"
        redis_publish "channel:tasks" "{\"agent\":\"$NAME\",\"task\":\"$TASK\",\"status\":\"started\"}"
        
        # 명령어 히스토리 추가
        redis_add_history "$NAME" "$TASK"
        
        # Claude 실행
        echo "[$NAME] Executing: $TASK"
        TIMESTAMP=$(date +%Y%m%d_%H%M%S)
        LOG_FILE="$LOG_DIR/${NAME}-${TIMESTAMP}.log"
        
        # Claude 실행 및 로그 저장
        echo "Task: $TASK" > "$LOG_FILE"
        echo "---" >> "$LOG_FILE"
        echo "$TASK" | $CLAUDE_CMD 2>&1 | while IFS= read -r line; do
            echo "$line" >> "$LOG_FILE"
            # 실시간으로 Redis에도 로그 전송
            redis_add_log "$NAME" "$line"
        done
        
        # 최신 로그 심볼릭 링크 업데이트
        ln -sf "$(basename "$LOG_FILE")" "$LOG_DIR/${NAME}-latest.log"
        
        redis_update_status "$NAME" "completed"
        redis_publish "channel:tasks" "{\"agent\":\"$NAME\",\"task\":\"$TASK\",\"status\":\"completed\"}"
        redis_add_log "$NAME" "Task completed"
    fi
    
    # CPU 부하 방지
    sleep 0.1
done