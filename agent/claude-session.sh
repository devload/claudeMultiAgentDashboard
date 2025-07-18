#!/bin/bash

TIMESTAMP=$(date +%s)
LOG_DIR="/Users/rohsunghyun/claudeAuto/logs"
LOG_FILE="$LOG_DIR/manual-$TIMESTAMP.log"

mkdir -p "$LOG_DIR"

echo "📝 Claude 세션 시작 로그: $LOG_FILE"
echo "==== Claude 세션 시작: $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE"

# macOS 기본 shell에서 입력 + 출력 기록
script "$LOG_FILE" claude

echo "==== Claude 세션 종료: $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE"
