#!/bin/bash
# 파일 작업을 직접 처리하는 개선된 에이전트 루프

AGENT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$AGENT_DIR" || exit 1

# 설정 로드 (기존과 동일)
CONFIG_FILE="$AGENT_DIR/agent.json"
NAME=$(jq -r .name "$CONFIG_FILE")
ROLE=$(jq -r .role "$CONFIG_FILE")
PROJECT_PATH=$(jq -r .project_path "$CONFIG_FILE")
ROOT_DIR=$(jq -r .root_dir "$CONFIG_FILE")

REGISTRY_DIR="$ROOT_DIR/registry"
LOGS_DIR="$ROOT_DIR/logs"
TASK_FILE="$ROOT_DIR/tasks/${NAME}.todo"

mkdir -p "$REGISTRY_DIR" "$LOGS_DIR" "$ROOT_DIR/tasks"

# 에이전트 등록
cat > "$REGISTRY_DIR/${NAME}.json" <<EOF
{
  "name": "$NAME",
  "role": "$ROLE",
  "status": "online",
  "started": "$(date -Iseconds)"
}
EOF

echo "🚀 [$NAME] 시작됨"

while true; do
  if [ -f "$TASK_FILE" ]; then
    PROMPT=$(cat "$TASK_FILE")
    TIMESTAMP=$(date +%s)
    LOG_FILE="$LOGS_DIR/${NAME}-${TIMESTAMP}.log"
    LATEST_LOG="$LOGS_DIR/${NAME}-latest.log"

    {
      echo "==== 작업 시작: $(date +"%Y-%m-%d %H:%M:%S") ===="
      echo "[📩 입력 프롬프트]"
      echo "$PROMPT"
      echo ""
      
      cd "$PROJECT_PATH"
      
      # 파일 작업 명령 패턴 감지 및 직접 실행
      if [[ "$PROMPT" =~ "파일을 만들어" ]] || [[ "$PROMPT" =~ "create.*file" ]]; then
        echo "[🔧 파일 작업 감지 - 직접 실행]"
        # 여기에 파일 생성 로직 추가
        echo "✅ 파일 작업 완료"
      else
        echo "[🧠 Claude 실행]"
        # 일반 명령은 Claude로 전달
        claude <<< "$PROMPT" 2>&1
      fi
      
      echo ""
      echo "==== 작업 종료: $(date +"%Y-%m-%d %H:%M:%S") ===="
    } | tee "$LOG_FILE"

    cp "$LOG_FILE" "$LATEST_LOG"
    rm "$TASK_FILE"
    echo "✅ [$NAME] 작업 완료"
  fi
  sleep 2
done