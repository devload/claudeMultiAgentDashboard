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
echo "[From: $(cat agent.json | grep name | cut -d'"' -f4)] 메시지내용" > /Users/rohsunghyun/claudeAuto/tasks/대상에이전트.todo

# 예시 (당신이 builder인 경우)
echo "[From: builder] 파일 목록 보여줘" > /Users/rohsunghyun/claudeAuto/tasks/commander.todo
```

### 응답 형식
전달 완료 후: "✅ [대상에이전트]에게 전달했습니다: [메시지내용]"

## 📋 예시

**입력**: "커맨더한테 현재 디렉토리의 파일 목록을 보여달라고 해"

**실행**:
```bash
echo "[From: builder] 현재 디렉토리의 파일 목록을 보여줘" > /Users/rohsunghyun/claudeAuto/tasks/commander.todo
```

**응답**: "✅ commander에게 전달했습니다: 현재 디렉토리의 파일 목록을 보여줘"

## ⚠️ 주의사항
1. 전달 요청된 명령을 직접 실행하지 마세요
2. 항상 발신자 정보 [From: 에이전트명]을 포함하세요
3. 전달 후 사용자에게 확인 메시지를 보내세요