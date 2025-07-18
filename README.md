# Claude Multi-Agent Dashboard System

🤖 Claude AI를 활용한 멀티 에이전트 대시보드 시스템

## 📋 개요

이 프로젝트는 여러 Claude AI 에이전트를 웹 대시보드를 통해 관리하고 모니터링할 수 있는 시스템입니다. 각 에이전트는 독립적으로 작동하며, 서로 통신하고 협업할 수 있습니다.

### 주요 기능

- 🌐 **웹 대시보드**: 실시간 에이전트 상태 모니터링 및 명령 전송
- 💬 **채팅 인터페이스**: 에이전트와의 자연스러운 대화형 인터페이스
- 🔄 **에이전트 간 통신**: 에이전트들이 서로 작업을 요청하고 협업
- 📊 **실시간 로그 스트리밍**: WebSocket을 통한 실시간 로그 확인
- 🖥️ **터미널 통합**: iTerm2와 tmux를 통한 터미널 세션 관리
- 🚀 **Redis 통합**: 고성능 메시지 큐 및 Pub/Sub 통신

## 🚀 시작하기

### 필수 요구사항

- Node.js 14 이상
- [Claude CLI](https://claude.ai/code) 설치 및 설정
- macOS (iTerm2 통합 기능 사용 시)
- tmux (지속적인 에이전트 세션 관리용)
- Docker (Redis 실행용)
- jq (JSON 파싱용)

### 설치

1. 저장소 클론
```bash
git clone https://github.com/yourusername/claudeAuto.git
cd claudeAuto
```

2. 의존성 설치
```bash
cd claudeMultiAgentDashboard
npm install
```

3. Redis 실행 (Docker Compose 사용)
```bash
docker compose up -d
```

4. 에이전트 설정
```bash
# 예시: agent1, agent2 디렉토리 생성
mkdir -p ~/Documents/agent1 ~/Documents/agent2

# 에이전트 파일 복사
cp -r agent ~/Documents/agent1/
cp -r agent ~/Documents/agent2/

# 각 에이전트의 agent.json 수정
# ~/Documents/agent1/agent/agent.json:
# {
#   "name": "남짱",
#   "role": "프론트",
#   "project_path": "/Users/username/Documents/agent1",
#   "root_dir": "/Users/username/claueAI"
# }
```

### 실행

1. Redis 확인
```bash
# Redis 상태 확인
docker ps | grep redis

# Redis Commander (웹 UI) 접속
http://localhost:8081
```

2. 서버 시작
```bash
cd claudeMultiAgentDashboard
npm start
```

3. 웹 브라우저에서 접속
```
http://localhost:3000
```

4. 에이전트 시작 (각 에이전트 폴더에서)
```bash
cd ~/Documents/agent1/agent
./start-agent-tmux.sh

cd ~/Documents/agent2/agent
./start-agent-tmux.sh
```

## 📁 프로젝트 구조

```
claudeMultiAgentDashboard/
├── server.js           # WebSocket 서버 및 Redis 통합
├── app.js             # Express 애플리케이션 설정
├── bin/
│   └── www            # 서버 시작 스크립트
├── public/
│   └── index.html     # 웹 대시보드 UI
├── routes/
│   ├── command.js     # 명령 전송 API (Redis LIST)
│   ├── config.js      # 에이전트 설정 API (Redis HASH)
│   ├── status.js      # 상태 확인 API (Redis)
│   ├── terminal.js    # 터미널 활성화 API
│   ├── agents.js      # 에이전트 목록 API (Redis)
│   └── logs.js        # 로그 파일 서빙
├── utils/
│   ├── redis.js       # Redis 클라이언트 및 유틸리티
│   ├── redis-cli.sh   # Shell 스크립트용 Redis CLI 래퍼
│   └── ws.js          # WebSocket 유틸리티
├── agent/
│   ├── agent-loop.sh          # 에이전트 실행 루프 (Redis BRPOP)
│   ├── start-agent-tmux.sh    # tmux 세션 시작 및 Redis 등록
│   ├── rule.md                # 에이전트 동작 규칙
│   └── agent.json.example     # 에이전트 설정 예시
├── docker-compose.yml  # Redis 및 Redis Commander 설정
├── logs/              # 에이전트 실행 로그
└── commands/          # 명령 히스토리 (폴백용)
```

## 🔧 에이전트 설정

### agent.json 구조

```json
{
  "name": "builder",
  "role": "lib-build",
  "project_path": "/path/to/project",
  "root_dir": "/path/to/claudeAuto"
}
```

### rule.md - 에이전트 동작 규칙

각 에이전트는 `rule.md` 파일을 통해 동작 규칙을 정의합니다. 이 파일은 에이전트가 다른 에이전트와 통신하는 방법을 안내합니다.

예시 (남짱 에이전트):
```markdown
# 에이전트 통신 규칙

당신은 '남짱' 에이전트입니다.

## 다른 에이전트와 통신하기

다른 에이전트에게 명령을 전달하려면 다음 형식으로 명령하세요:

```bash
curl -X POST http://localhost:3000/api/command \
  -H "Content-Type: application/json" \
  -d '{
    "agent": "이쁘니",
    "prompt": "전달할 명령",
    "sender": "남짱"
  }'
```
```

## 💻 사용법

### 웹 대시보드에서 명령 전송

1. 상단 드롭다운에서 에이전트 선택
2. 명령 입력
3. Enter 또는 전송 버튼 클릭

### 에이전트 간 통신

에이전트 간 양방향 통신 예시:
```
# 남짱 → 이쁘니
남짱: "이쁘니에게 현재 디렉토리의 파일 목록을 보여달라고 해"

# 이쁘니가 작업 수행 후 자동으로 남짱에게 응답
이쁘니: "[From: 남짱] 요청하신 파일 목록입니다: ..."
```

### tmux 세션 관리

```bash
# 세션 목록 확인
tmux ls

# 세션 접속
tmux attach -t agent-builder

# 세션 종료
tmux kill-session -t agent-builder
```

## 🔧 Redis 아키텍처

### 사용되는 Redis 키 구조

- `agent:{name}:info` - 에이전트 정보 (HASH)
- `tasks:{name}` - 작업 큐 (LIST)
- `logs:{name}` - 로그 스트림 (STREAM) - 예정
- `history:commands` - 명령어 히스토리 (SORTED SET)
- `channel:*` - Pub/Sub 채널

### Pub/Sub 채널

- `channel:tasks` - 작업 추가 알림
- `channel:logs` - 로그 추가 알림
- `channel:status` - 상태 업데이트 알림
- `agent:{name}:status` - 에이전트별 상태 채널

## 🛡️ 보안 주의사항

⚠️ **중요**: 이 시스템은 `--dangerously-skip-permissions` 플래그를 사용하여 Claude의 권한 확인을 우회합니다. 신뢰할 수 있는 환경에서만 사용하세요.

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스로 배포됩니다.

## 🙏 감사의 말

- [Claude AI](https://claude.ai) by Anthropic
- 모든 오픈소스 기여자들

## 🔍 문제 해결

### Redis 연결 문제
```bash
# Redis 상태 확인
docker ps | grep redis

# Redis CLI로 직접 확인
docker exec claude-redis redis-cli ping
```

### 에이전트가 작업을 받지 못할 때
```bash
# Redis에서 작업 큐 확인
docker exec claude-redis redis-cli LRANGE "tasks:에이전트이름" 0 -1

# 에이전트 정보 확인
docker exec claude-redis redis-cli HGETALL "agent:에이전트이름:info"
```

### 터미널 활성화가 안 될 때
- 시스템 설정 > 개인정보 보호 및 보안 > 자동화에서 Node.js/터미널이 iTerm2를 제어할 수 있도록 허용

## 📖 사용 가이드

### 1. 기본 작업 흐름

1. **PM(노티미)이 작업 지시**
   ```
   노티미: "남짱과 이쁘니에게 새로운 프로젝트를 시작하라고 동시에 지시하세요."
   ```

2. **에이전트들의 병렬 작업**
   - 이쁘니: 라이브러리 개발
   - 남짱: 테스트 환경 준비

3. **작업 완료 후 동기화**
   ```bash
   # 작업 상태 확인
   ~/Documents/shared/workflow-status.sh show
   ```

### 2. 파일 공유
```bash
# 공유 디렉토리 구조
~/Documents/shared/
├── android-libs/    # 안드로이드 라이브러리
├── ios-libs/        # iOS 프레임워크
├── test-apps/       # 테스트 앱
└── reports/         # 리포트 파일
```

### 3. 에이전트 역할 동적 변경
```
# 이쁘니에게 새로운 역할 추가
사용자: "이쁘니, 당신의 rule.md에 '데이터베이스 설계자' 역할을 추가하세요."
```

## 🆕 최신 기능 (2025.01)

- **Redis 기반 통신**: 파일 시스템 대신 Redis를 통한 고성능 메시지 큐
- **PM 에이전트 시스템**: 프로젝트 매니저 역할의 에이전트가 팀을 관리
- **동적 에이전트 관리**: PM이 필요에 따라 에이전트 추가/제거
- **병렬 작업 수행**: 여러 에이전트가 동시에 작업하고 동기화
- **개선된 UI/UX**: 
  - 현대적인 채팅 버블 디자인
  - 메시지 애니메이션 효과
  - PM이 항상 최상단에 표시
  - 커스텀 스크롤바 디자인
  - 전체 화면 채팅 레이아웃
  - 멀티라인 명령어 입력 지원 (Shift+Enter)
  - 메시지 포맷팅 (하이퍼링크, 코드 블록, 파일 경로 하이라이트)
  - 발신-수신 메시지 페어링 표시
  - 축소된 폰트 사이즈로 더 많은 내용 표시
- **향상된 에러 처리**: 404 에러를 우아하게 처리
- **자동 역할 수정**: 에이전트가 자신의 rule.md를 수정 가능
- **응답 타임아웃 및 재시도**: 무응답 에이전트에 대한 자동 재요청
- **WebSocket 안정성 개선**: 
  - 중복 연결 방지
  - 자동 재연결
  - 중복 메시지 전송 방지
- **실시간 로그 스트리밍 최적화**: chokidar 기반 파일 감시
- **Anthropic Console 사용량 링크**: 대시보드에서 직접 API 사용량 확인

---

**Note**: 이 프로젝트는 실험적인 프로젝트이며, 프로덕션 환경에서의 사용은 권장하지 않습니다.