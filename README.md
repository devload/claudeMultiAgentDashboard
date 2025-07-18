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

## 🚀 시작하기

### 필수 요구사항

- Node.js 14 이상
- [Claude CLI](https://claude.ai/code) 설치 및 설정
- macOS (iTerm2 통합 기능 사용 시)
- tmux (지속적인 에이전트 세션 관리용)

### 설치

1. 저장소 클론
```bash
git clone https://github.com/yourusername/claudeAuto.git
cd claudeAuto
```

2. 의존성 설치
```bash
npm install
```

3. 에이전트 설정
```bash
# 각 에이전트 폴더에 agent.json 생성
cp agent/agent.json.example /path/to/your/agent/folder/agent.json
# agent.json을 수정하여 에이전트 정보 설정
```

### 실행

1. 서버 시작
```bash
npm start
```

2. 웹 브라우저에서 접속
```
http://localhost:3000
```

3. 에이전트 시작 (각 에이전트 폴더에서)
```bash
./agent/start-agent-tmux.sh
```

## 📁 프로젝트 구조

```
claudeAuto/
├── server.js           # WebSocket 서버 및 파일 감시
├── app.js             # Express 애플리케이션 설정
├── bin/
│   └── www            # 서버 시작 스크립트
├── public/
│   └── index.html     # 웹 대시보드 UI
├── routes/
│   ├── command.js     # 명령 전송 API
│   ├── config.js      # 에이전트 설정 API
│   ├── status.js      # 상태 확인 API
│   ├── terminal.js    # 터미널 활성화 API
│   ├── agents.js      # 에이전트 목록 API
│   └── logs.js        # 로그 파일 서빙
├── agent/
│   ├── agent-loop.sh          # 에이전트 실행 루프
│   ├── start-agent-tmux.sh    # tmux 세션 시작
│   ├── send-to-agent.sh       # 에이전트 간 통신
│   ├── rule.md                # 에이전트 동작 규칙
│   └── agent.json.example     # 에이전트 설정 예시
├── tasks/             # 에이전트 작업 큐 (.todo 파일)
├── logs/              # 에이전트 실행 로그
├── registry/          # 등록된 에이전트 정보
└── commands/          # 명령 히스토리
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

## 💻 사용법

### 웹 대시보드에서 명령 전송

1. 상단 드롭다운에서 에이전트 선택
2. 명령 입력
3. Enter 또는 전송 버튼 클릭

### 에이전트 간 통신

Builder에서 Commander로 명령 전달 예시:
```
commander에게 현재 디렉토리의 파일 목록을 보여달라고 해
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

---

**Note**: 이 프로젝트는 실험적인 프로젝트이며, 프로덕션 환경에서의 사용은 권장하지 않습니다.