# Claude Multi-Agent Dashboard Makefile

.PHONY: help redis-up redis-down redis-logs redis-cli install start dev clean

help:
	@echo "사용 가능한 명령어:"
	@echo "  make redis-up     - Redis Docker 컨테이너 시작"
	@echo "  make redis-down   - Redis Docker 컨테이너 중지"
	@echo "  make redis-logs   - Redis 로그 확인"
	@echo "  make redis-cli    - Redis CLI 접속"
	@echo "  make install      - npm 패키지 설치"
	@echo "  make start        - 서버 시작 (production)"
	@echo "  make dev          - 서버 시작 (development)"
	@echo "  make clean        - 임시 파일 정리"

# Redis Docker 관련
redis-up:
	docker compose up -d redis redis-commander
	@echo "✅ Redis가 시작되었습니다."
	@echo "📡 Redis: localhost:6379"
	@echo "🌐 Redis Commander: http://localhost:8081"

redis-down:
	docker compose down
	@echo "🛑 Redis가 중지되었습니다."

redis-logs:
	docker compose logs -f redis

redis-cli:
	docker exec -it claude-redis redis-cli

# Node.js 서버 관련
install:
	npm install

start: redis-up
	npm start

dev: redis-up
	npm run dev

# 정리
clean:
	rm -rf logs/*.log
	rm -rf tasks/*.todo
	rm -rf commands/*.cmd
	@echo "🧹 임시 파일이 정리되었습니다."

# 전체 시스템 시작
all: redis-up install start

# 상태 확인
status:
	@echo "🐳 Docker 컨테이너 상태:"
	@docker compose ps
	@echo ""
	@echo "📊 Redis 상태:"
	@docker exec claude-redis redis-cli ping || echo "Redis가 실행중이지 않습니다."