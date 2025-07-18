# Redis Docker 설정 가이드

## 빠른 시작

```bash
# 1. Redis 초기화 및 시작
./scripts/redis-init.sh

# 2. 서버 시작
npm start

# 3. 에이전트 실행 (Redis 모드)
./agent/agent-loop-redis.sh builder
```

## Docker Compose 구성

### 서비스
- **redis**: Redis 7 Alpine 버전 (메인 데이터베이스)
- **redis-commander**: Redis 웹 UI (관리 도구)

### 포트
- `6379`: Redis 서버
- `8081`: Redis Commander 웹 UI

## 주요 명령어

### Makefile 사용
```bash
make redis-up      # Redis 시작
make redis-down    # Redis 중지
make redis-logs    # 로그 확인
make redis-cli     # Redis CLI 접속
make dev           # 개발 모드 (Redis + 서버)
```

### Docker Compose 직접 사용
```bash
# Redis 시작
docker compose up -d

# Redis 중지
docker compose down

# Redis 로그 확인
docker compose logs -f redis

# Redis CLI 접속
docker exec -it claude-redis redis-cli
```

## Redis 데이터 구조

```
tasks:{agent}         # 작업 큐 (LIST)
logs:{agent}          # 로그 스트림 (STREAM)
agent:{agent}:status  # 에이전트 상태 (HASH)
registry:agents       # 에이전트 레지스트리 (HASH)
history:commands      # 명령어 히스토리 (SORTED SET)
```

## 환경 변수

`.env` 파일 생성:
```env
REDIS_URL=redis://localhost:6379
USE_REDIS=true
```

## 문제 해결

### Docker가 설치되지 않은 경우
1. [Docker Desktop](https://www.docker.com/products/docker-desktop) 다운로드 및 설치
2. Docker Desktop 실행
3. 터미널 재시작

### Redis 연결 실패
```bash
# Redis 상태 확인
docker ps | grep redis

# Redis 로그 확인
docker logs claude-redis

# Redis 재시작
docker compose restart redis
```

### 포트 충돌
기존 Redis가 실행 중인 경우:
```bash
# 기존 Redis 중지
brew services stop redis

# 또는 docker compose.yml에서 포트 변경
ports:
  - "6380:6379"  # 6380으로 변경
```

## 모니터링

### Redis Commander
웹 브라우저에서 http://localhost:8081 접속

### Redis CLI 모니터링
```bash
# 실시간 명령어 모니터링
docker exec -it claude-redis redis-cli monitor

# 메모리 사용량 확인
docker exec -it claude-redis redis-cli info memory

# 모든 키 확인
docker exec -it claude-redis redis-cli keys '*'
```

## 데이터 백업/복원

### 백업
```bash
docker exec claude-redis redis-cli SAVE
docker cp claude-redis:/data/dump.rdb ./backup/
```

### 복원
```bash
docker cp ./backup/dump.rdb claude-redis:/data/
docker compose restart redis
```