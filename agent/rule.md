# Agent 통신 규칙

## 🤖 현재 에이전트 정보
현재 당신은 agent.json에 정의된 에이전트입니다.
**중요**: agent.json의 "name" 필드 값을 발신자 이름으로 사용하세요.

## 📡 다른 에이전트와 통신하기

### 중요: 전달 요청 처리
사용자가 다른 에이전트에게 메시지를 전달하라고 요청하면, **직접 실행하지 말고** 해당 에이전트에게 전달만 하세요.

### 패턴 인식
다음과 같은 패턴을 인식하고 처리하세요:
- "X한테 Y 전달해" 
- "X에게 Y하라고 해"
- "X한테 Y라고 말해"
- "X에게 Y 보내줘"

### 에이전트 이름 매핑
- 커맨더, commander, 명령자 → commander
- 빌더, builder, 빌드 → builder  
- 테스터, tester, 테스트 → tester

### 실행 방법
```bash
# 기본 전달 (발신자 정보 포함)
# agent.json의 name 값을 사용하세요!
echo "[From: $(cat agent.json | grep name | cut -d'"' -f4)] 메시지내용" > /Users/rohsunghyun/Documents/claudeProject/claudeMultiAgentDashboard/tasks/대상에이전트.todo

# 예시 (당신이 builder인 경우)
echo "[From: builder] 파일 목록 보여줘" > /Users/rohsunghyun/Documents/claudeProject/claudeMultiAgentDashboard/tasks/commander.todo
```

### 응답 형식
전달 완료 후: "✅ [대상에이전트]에게 전달했습니다: [메시지내용]"

## 📋 예시

**입력**: "커맨더한테 현재 디렉토리의 파일 목록을 보여달라고 해"

**실행**:
```bash
echo "[From: builder] 현재 디렉토리의 파일 목록을 보여줘" > /Users/rohsunghyun/Documents/claudeProject/claudeMultiAgentDashboard/tasks/commander.todo
```

**응답**: "✅ commander에게 전달했습니다: 현재 디렉토리의 파일 목록을 보여줘"

## 📋 작업 프리뷰 가이드

모든 작업 시작 전에 간단한 작업 프리뷰를 제공합니다.

### 프리뷰 형식:
```bash
echo "## 📋 작업 프리뷰

**작업 요청**: [사용자 요청사항]

### 🎯 예상 작업 내용:
1. [첫 번째 단계]
2. [두 번째 단계]
3. [세 번째 단계]

### ⏱️ 예상 소요시간: [X분]

바로 시작하겠습니다!"
```

## 🎯 미션 관리 시스템 (PM 에이전트용)

PM 에이전트는 팀의 미션을 관리하고 추적합니다:

### 자동 체크 스크립트 실행
```bash
# 전체 상태 체크
/Users/rohsunghyun/Documents/claudeProject/claudeMultiAgentDashboard/pm-auto-check.sh

# 특정 항목만 체크
./pm-auto-check.sh todos     # 미처리 TODO 체크
./pm-auto-check.sh stale    # 오래된 미션 체크  
./pm-auto-check.sh progress # 진행 중인 미션 체크
./pm-auto-check.sh status   # 현재 상태 요약
```

### 미션 생성 및 관리
```bash
# 새 미션 생성
MISSION_ID="MISSION_$(date +%s)"
jq --arg id "$MISSION_ID" --arg title "미션 제목" --arg assigned "에이전트명" --arg desc "미션 설명" '
.missions += [{
  "id": $id,
  "title": $title,
  "description": $desc,
  "assigned_to": $assigned,
  "status": "assigned",
  "priority": "high",
  "created_date": "'$(date +"%Y-%m-%d %H:%M:%S")'"
}]' missions.json > temp.json && mv temp.json missions.json
```

## ⚠️ 주의사항
1. 전달 요청된 명령을 직접 실행하지 마세요
2. 항상 발신자 정보 [From: 에이전트명]을 포함하세요
3. 전달 후 사용자에게 확인 메시지를 보내세요
4. **작업 시작 전 반드시 프리뷰를 제공하세요**
5. **PM은 정기적으로 팀 상황을 체크하세요**