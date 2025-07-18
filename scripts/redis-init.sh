#!/bin/bash

# Redis 초기화 스크립트
echo "🚀 Redis 초기화 시작..."

# Docker가 설치되어 있는지 확인
if ! command -v docker &> /dev/null; then
    echo "❌ Docker가 설치되어 있지 않습니다."
    echo "Docker Desktop을 먼저 설치해주세요: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Docker Compose 버전 확인 (새로운 docker compose 명령어)
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose가 사용할 수 없습니다."
    echo "최신 Docker Desktop을 설치하거나 업데이트해주세요."
    exit 1
fi

# Docker 서비스가 실행중인지 확인
if ! docker info &> /dev/null; then
    echo "❌ Docker 서비스가 실행중이 아닙니다."
    echo "Docker Desktop을 실행해주세요."
    exit 1
fi

# Redis 컨테이너 시작
echo "📦 Redis 컨테이너 시작중..."
docker compose up -d redis redis-commander

# Redis가 준비될 때까지 대기
echo "⏳ Redis 시작 대기중..."
for i in {1..30}; do
    if docker exec claude-redis redis-cli ping &> /dev/null; then
        echo "✅ Redis가 성공적으로 시작되었습니다!"
        break
    fi
    sleep 1
done

# Redis 연결 테스트
echo "🔍 Redis 연결 테스트..."
if docker exec claude-redis redis-cli ping | grep -q "PONG"; then
    echo "✅ Redis 연결 성공!"
else
    echo "❌ Redis 연결 실패"
    exit 1
fi

# 기본 데이터 설정 (선택사항)
echo "📝 기본 에이전트 등록..."
docker exec claude-redis redis-cli HSET registry:agents builder '{"name":"builder","type":"primary","status":"ready"}'
docker exec claude-redis redis-cli HSET registry:agents commander '{"name":"commander","type":"secondary","status":"ready"}'

echo ""
echo "🎉 Redis 초기화 완료!"
echo "📡 Redis 서버: localhost:6379"
echo "🌐 Redis Commander (웹 UI): http://localhost:8081"
echo ""
echo "다음 명령어로 서버를 시작하세요:"
echo "  npm start"