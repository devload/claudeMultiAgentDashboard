#!/bin/bash

# Redis 연결 설정
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_CLI="redis-cli -h $REDIS_HOST -p $REDIS_PORT"

# 작업 큐에 추가
redis_push_task() {
    local agent_name=$1
    local task=$2
    $REDIS_CLI LPUSH "tasks:$agent_name" "$task"
}

# 작업 가져오기 (블로킹)
redis_get_task() {
    local agent_name=$1
    local timeout=${2:-0}  # 0 = 무한 대기
    $REDIS_CLI BRPOP "tasks:$agent_name" $timeout | tail -n1
}

# 로그 추가
redis_add_log() {
    local agent_name=$1
    local message=$2
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    $REDIS_CLI XADD "logs:$agent_name" "*" timestamp "$timestamp" message "$message"
}

# 로그 읽기 (최신 N개)
redis_read_logs() {
    local agent_name=$1
    local count=${2:-10}
    $REDIS_CLI XREVRANGE "logs:$agent_name" + - COUNT $count
}

# 상태 업데이트
redis_update_status() {
    local agent_name=$1
    local status=$2
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    $REDIS_CLI HSET "agent:$agent_name:status" \
        status "$status" \
        last_update "$timestamp" \
        pid "$$"
}

# 이벤트 발행
redis_publish() {
    local channel=$1
    local message=$2
    $REDIS_CLI PUBLISH "$channel" "$message"
}

# 이벤트 구독 (백그라운드 프로세스로 실행)
redis_subscribe() {
    local channel=$1
    local callback=$2
    $REDIS_CLI SUBSCRIBE "$channel" | while read type channel message; do
        if [ "$type" = "message" ]; then
            $callback "$message"
        fi
    done
}

# 명령어 히스토리 추가
redis_add_history() {
    local agent_name=$1
    local command=$2
    local timestamp=$(date +%s)
    local json="{\"agent\":\"$agent_name\",\"command\":\"$command\",\"timestamp\":$timestamp}"
    $REDIS_CLI ZADD "history:commands" $timestamp "$json"
}

# Agent 등록
redis_register_agent() {
    local agent_name=$1
    local config=$2
    $REDIS_CLI HSET "registry:agents" "$agent_name" "$config"
    redis_update_status "$agent_name" "registered"
}

# Agent 목록 조회
redis_list_agents() {
    $REDIS_CLI HKEYS "registry:agents"
}

# TTL 설정 (오래된 작업 자동 삭제)
redis_expire_task() {
    local key=$1
    local ttl=${2:-3600}  # 기본 1시간
    $REDIS_CLI EXPIRE "$key" $ttl
}