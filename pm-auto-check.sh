#!/bin/bash
# PM 자동 진행상황 체크 스크립트

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MISSIONS_FILE="/Users/rohsunghyun/Documents/claudeProject/claudeMultiAgentDashboard/missions.json"
TASKS_DIR="/Users/rohsunghyun/Documents/claudeProject/claudeMultiAgentDashboard/tasks"

log_message() {
    echo "[$(date +"%Y-%m-%d %H:%M:%S")] $1" >> "$SCRIPT_DIR/pm-check.log"
}

# 1. 처리되지 않은 .todo 파일 체크
check_pending_todos() {
    log_message "=== TODO 파일 체크 시작 ==="
    
    for agent in "WhatapAndroidAgent" "android-tester" "iosAgent"; do
        TODO_FILE="$TASKS_DIR/${agent}.todo"
        
        if [[ -f "$TODO_FILE" && -s "$TODO_FILE" ]]; then
            log_message "⚠️ ${agent}에게 처리되지 않은 작업 발견"
            # PM에게 알림
            echo "[AutoCheck] ⚠️ ${agent}에게 처리되지 않은 작업이 있습니다: $(head -1 "$TODO_FILE")" > "$TASKS_DIR/pm.todo"
        fi
    done
}

# 2. 오래된 미션 체크 (1시간 이상 assigned)
check_stale_missions() {
    if [[ ! -f "$MISSIONS_FILE" ]]; then
        log_message "❌ missions.json 파일을 찾을 수 없습니다"
        return
    fi
    
    log_message "=== 오래된 미션 체크 시작 ==="
    
    CURRENT_TIME=$(date +%s)
    
    jq -r '.missions[] | select(.status == "assigned") | "\(.id)|\(.created_date)|\(.assigned_to)"' "$MISSIONS_FILE" | while IFS='|' read -r mission_id created_date assigned_to; do
        # macOS date 명령어 사용
        CREATED_TIME=$(date -j -f "%Y-%m-%d %H:%M:%S" "$created_date" +%s 2>/dev/null || echo 0)
        TIME_DIFF=$(($CURRENT_TIME - $CREATED_TIME))
        
        if [[ $TIME_DIFF -gt 3600 ]]; then  # 1시간 = 3600초
            log_message "⏰ 미션 $mission_id 가 1시간 이상 assigned 상태"
            echo "[From: pm] 🔔 미션 $mission_id 상태 확인 요청 - 진행 중인가요? (1시간 이상 미처리)" > "$TASKS_DIR/${assigned_to}.todo"
        fi
    done
}

# 3. 진행 중인 미션 정기 확인 (30분마다 - 실제로는 호출할 때만)
check_progress_missions() {
    if [[ ! -f "$MISSIONS_FILE" ]]; then
        return
    fi
    
    log_message "=== 진행 중인 미션 체크 시작 ==="
    
    jq -r '.missions[] | select(.status == "in_progress") | "\(.id)|\(.assigned_to)"' "$MISSIONS_FILE" | while IFS='|' read -r mission_id assigned_to; do
        if [[ "$mission_id" != "null" && "$mission_id" != "" ]]; then
            log_message "📈 미션 $mission_id (담당: $assigned_to) 진행 상황 체크 요청"
            echo "[From: pm] 📈 정기 체크: 미션 $mission_id 진행 상황 간단히 업데이트 부탁드립니다" > "$TASKS_DIR/${assigned_to}.todo"
        fi
    done
}

# 4. 에이전트 재시작 감지
detect_agent_restart() {
    log_message "=== 에이전트 재시작 감지 시작 ==="
    
    for agent in "WhatapAndroidAgent" "android-tester" "iosAgent"; do
        # tmux 세션 확인
        if ! tmux has-session -t "agent-$agent" 2>/dev/null; then
            log_message "⚠️ ${agent} tmux 세션이 없습니다"
            continue
        fi
        
        # 해당 에이전트의 진행 중인 미션 확인
        if [[ -f "$MISSIONS_FILE" ]]; then
            AGENT_MISSION=$(jq -r ".missions[] | select(.assigned_to == \"$agent\" and .status == \"in_progress\") | .id" "$MISSIONS_FILE")
            
            if [[ "$AGENT_MISSION" != "null" && "$AGENT_MISSION" != "" ]]; then
                # 마지막 활동 시간 체크 (여기서는 단순히 재시작 알림)
                log_message "🔄 ${agent} 재시작 감지 - 미션 $AGENT_MISSION 재개 요청"
                echo "[From: pm] 🔄 재시작 감지: 진행 중인 미션 $AGENT_MISSION 상태 확인 및 재개 부탁드립니다" > "$TASKS_DIR/${agent}.todo"
            fi
        fi
    done
}

# 5. 현재 상태 요약
show_status_summary() {
    if [[ ! -f "$MISSIONS_FILE" ]]; then
        echo "❌ missions.json 파일을 찾을 수 없습니다"
        return
    fi
    
    echo "## 📊 현재 미션 상태 체크 ($(date +"%H:%M"))"
    echo ""
    
    echo "### 📈 미션 현황"
    echo "- 전체 미션: $(jq '.missions | length' "$MISSIONS_FILE")개"
    echo "- 완료: $(jq '.missions | map(select(.status == "completed")) | length' "$MISSIONS_FILE")개"
    echo "- 진행중: $(jq '.missions | map(select(.status == "in_progress")) | length' "$MISSIONS_FILE")개"
    echo "- 할당됨: $(jq '.missions | map(select(.status == "assigned")) | length' "$MISSIONS_FILE")개"
    echo ""
    
    echo "### 🎯 진행 중인 미션들"
    jq -r '.missions[] | select(.status != "completed") | "- \(.id): \(.status) (\(.assigned_to))"' "$MISSIONS_FILE"
    echo ""
}

# 메인 실행
main() {
    case "${1:-all}" in
        "todos")
            check_pending_todos
            ;;
        "stale")
            check_stale_missions
            ;;
        "progress")
            check_progress_missions
            ;;
        "restart")
            detect_agent_restart
            ;;
        "status")
            show_status_summary
            ;;
        "all")
            check_pending_todos
            check_stale_missions
            show_status_summary
            ;;
        *)
            echo "사용법: $0 [todos|stale|progress|restart|status|all]"
            exit 1
            ;;
    esac
}

main "$@"