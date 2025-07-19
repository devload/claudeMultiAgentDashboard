#!/bin/bash
# 사용자 지시사항 관리 도구

USER_TASKS_FILE="/Users/rohsunghyun/Documents/claudeProject/claudeMultiAgentDashboard/user-tasks.json"

# 내가 내린 지시사항 조회
my_instructions() {
    echo "📋 내가 내린 지시사항들:"
    echo ""
    
    if [[ -f "$USER_TASKS_FILE" ]]; then
        jq -r '.my_instructions[] | "ID: \(.instruction_id) | 상태: \(.status) | 제목: \(.title) | 날짜: \(.created_date)"' "$USER_TASKS_FILE"
    else
        echo "❌ 지시사항 파일이 없습니다."
    fi
}

# 완료 확인 대기 중인 작업들
pending_confirmations() {
    echo "⏳ 완료 확인 대기 중인 작업들:"
    echo ""
    
    if [[ -f "$USER_TASKS_FILE" ]]; then
        jq -r '.pending_confirmations[] | "미션: \(.mission_id) | 보고일: \(.reported_date) | 보고내용: \(.completion_report)"' "$USER_TASKS_FILE"
    else
        echo "❌ 대기 중인 확인 작업이 없습니다."
    fi
}

# 새 지시사항 기록
record_instruction() {
    local title="$1"
    local description="$2"
    
    if [[ -z "$title" || -z "$description" ]]; then
        echo "사용법: record_instruction <제목> <설명>"
        return 1
    fi
    
    local instruction_id="INST_$(date +%s)"
    
    # user-tasks.json이 없으면 생성
    if [[ ! -f "$USER_TASKS_FILE" ]]; then
        cat > "$USER_TASKS_FILE" <<EOF
{
  "user_info": {
    "name": "사용자",
    "role": "프로젝트 오너",
    "last_updated": "$(date +"%Y-%m-%d")"
  },
  "my_instructions": [],
  "pending_confirmations": [],
  "completed_tasks": []
}
EOF
    fi
    
    # 새 지시사항 추가
    jq --arg id "$instruction_id" --arg title "$title" --arg desc "$description" --arg date "$(date +"%Y-%m-%d %H:%M:%S")" '
    .my_instructions += [{
      "instruction_id": $id,
      "title": $title,
      "description": $desc,
      "assigned_to": "pm",
      "status": "in_progress", 
      "created_date": $date,
      "sub_missions": []
    }]' "$USER_TASKS_FILE" > temp.json && mv temp.json "$USER_TASKS_FILE"
    
    echo "✅ 지시사항이 기록되었습니다: $instruction_id"
    echo "PM에게 전달: echo \"$description\" > /Users/rohsunghyun/Documents/claudeProject/claudeMultiAgentDashboard/tasks/pm.todo"
}

# 미션 최종 승인
approve_mission() {
    local mission_id="$1"
    
    if [[ -z "$mission_id" ]]; then
        echo "사용법: approve_mission <미션ID>"
        return 1
    fi
    
    echo "PM한테 미션 $mission_id 최종 승인" > /Users/rohsunghyun/Documents/claudeProject/claudeMultiAgentDashboard/tasks/pm.todo
    echo "✅ PM에게 미션 승인 요청을 전송했습니다: $mission_id"
}

# 전체 현황 조회
project_overview() {
    echo "📊 프로젝트 전체 현황:"
    echo ""
    
    if [[ -f "$USER_TASKS_FILE" ]]; then
        echo "=== 내 지시사항 현황 ==="
        jq -r '
        "총 지시사항: \(.my_instructions | length)개",
        "진행중: \(.my_instructions | map(select(.status == "in_progress")) | length)개", 
        "완료: \(.my_instructions | map(select(.status == "completed")) | length)개",
        "완료 확인 대기: \(.pending_confirmations | length)개"
        ' "$USER_TASKS_FILE"
        echo ""
    fi
    
    echo "PM에게 전체 현황 요청 중..."
    echo "현재 작업중인 리스트와 팀원들의 미션 현황을 알려줘" > /Users/rohsunghyun/Documents/claudeProject/claudeMultiAgentDashboard/tasks/pm.todo
}

# 도움말
show_help() {
    echo "🎯 내 지시사항 관리 도구"
    echo ""
    echo "명령어:"
    echo "  my-instructions                    - 내가 내린 지시사항 조회"
    echo "  pending-confirmations             - 완료 확인 대기 작업 조회"
    echo "  record <제목> <설명>              - 새 지시사항 기록"
    echo "  approve <미션ID>                  - 미션 최종 승인"
    echo "  overview                          - 전체 프로젝트 현황"
    echo ""
    echo "예시:"
    echo "  ./my-tasks.sh record \"네트워크 모니터링\" \"HTTP 요청 추적 기능 구현\""
    echo "  ./my-tasks.sh approve MISSION_1234567890"
    echo "  ./my-tasks.sh overview"
}

# 메인 명령어 처리
case "$1" in
    "my-instructions")
        my_instructions
        ;;
    "pending-confirmations")
        pending_confirmations
        ;;
    "record")
        record_instruction "$2" "$3"
        ;;
    "approve") 
        approve_mission "$2"
        ;;
    "overview")
        project_overview
        ;;
    "help"|*)
        show_help
        ;;
esac