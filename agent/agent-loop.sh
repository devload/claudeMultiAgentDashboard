#!/bin/bash
# agent-loop.sh — JSON 또는 YAML config를 지원하는 Claude 에이전트 실행기

AGENT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$AGENT_DIR" || exit 1

NAME=""
ROLE=""
PROJECT_PATH=""
ROOT_DIR=""
CONFIG_FILE="$AGENT_DIR/agent.json"

# JSON 우선, YAML fallback 지원
if [[ -f "$AGENT_DIR/agent.json" ]]; then
  if ! command -v jq &>/dev/null; then
    echo "❌ jq가 설치되어 있어야 합니다 (brew install jq)"
    exit 1
  fi
  NAME=$(jq -r .name "$CONFIG_FILE")
  ROLE=$(jq -r .role "$CONFIG_FILE")
  PROJECT_PATH=$(jq -r .project_path "$CONFIG_FILE")
  ROOT_DIR=$(jq -r .root_dir "$CONFIG_FILE")
elif [[ -f "$AGENT_DIR/agent.yaml" || -f "$AGENT_DIR/agent.yml" ]]; then
  CONFIG_FILE=$(ls "$AGENT_DIR"/agent.ya* 2>/dev/null | head -n 1)
  if ! command -v yq &>/dev/null; then
    echo "❌ yq가 설치되어 있어야 합니다 (brew install yq)"
    exit 1
  fi
  NAME=$(yq -r .name "$CONFIG_FILE")
  ROLE=$(yq -r .role "$CONFIG_FILE")
  PROJECT_PATH=$(yq -r .project_path "$CONFIG_FILE")
  ROOT_DIR=$(yq -r .root_dir "$CONFIG_FILE")
else
  echo "❌ agent.json 또는 agent.yaml 설정 파일이 현재 디렉토리에 필요합니다."
  exit 1
fi

REGISTRY_DIR="$ROOT_DIR/registry"
LOGS_DIR="$ROOT_DIR/logs"
TASK_FILE="$ROOT_DIR/tasks/${NAME}.todo"

mkdir -p "$REGISTRY_DIR" "$LOGS_DIR" "$ROOT_DIR/tasks"

# 에이전트 등록 (TTY 정보 포함)
cat > "$REGISTRY_DIR/${NAME}.json" <<EOF
{
  "name": "$NAME",
  "role": "$ROLE",
  "status": "online",
  "started": "$(date -Iseconds)",
  "pid": $$,
  "tty": "$(tty)",
  "hostname": "$(hostname)"
}
EOF

# iTerm2 윈도우/탭 제목 설정
echo -e "\033]0;🤖 Agent: $NAME [$ROLE]\007"

echo "🚀 [$NAME] 등록 완료: 역할=$ROLE | 프로젝트=$PROJECT_PATH"
echo "📡 [$NAME] 작업 감시 중... ($TASK_FILE)"

while true; do
  if [ -f "$TASK_FILE" ]; then
    echo "▶️ [$NAME] 작업 발견! Claude 실행..."
    PROMPT=$(cat "$TASK_FILE")

    TIMESTAMP=$(date +%s)
    LOG_FILE="$LOGS_DIR/${NAME}-${TIMESTAMP}.log"
    LATEST_LOG="$LOGS_DIR/${NAME}-latest.log"

    {
      echo "==== Claude 실행 시작: $(date +"%Y-%m-%d %H:%M:%S") ===="
      echo "[📩 입력 프롬프트]"
      echo "$PROMPT"
      echo ""
      echo "[🧠 Claude 응답]"

      cd "$PROJECT_PATH"
      
      # rule.md가 있으면 프롬프트에 포함
      RULE_FILE="$AGENT_DIR/rule.md"
      if [ -f "$RULE_FILE" ]; then
        FULL_PROMPT="먼저 다음 규칙을 읽고 이해하세요:

$(cat "$RULE_FILE")

---
이제 사용자 요청을 처리하세요:
$PROMPT"
      else
        FULL_PROMPT="$PROMPT"
      fi
      
      # 모든 권한 체크를 우회하여 자동 실행
      claude --dangerously-skip-permissions <<< "$FULL_PROMPT" 2>&1

      echo ""
      echo "==== Claude 실행 종료: $(date +"%Y-%m-%d %H:%M:%S") ===="
    } | tee "$LOG_FILE"

    # 최신 로그로도 복사
    cp "$LOG_FILE" "$LATEST_LOG"

    rm "$TASK_FILE"
    echo "✅ [$NAME] 작업 완료."
  fi
  sleep 2
done
