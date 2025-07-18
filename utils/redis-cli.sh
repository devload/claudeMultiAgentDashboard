#!/bin/bash
# Redis CLI wrapper for shell scripts

# Redis 컨테이너 이름
REDIS_CONTAINER="claude-redis"

# 명령어 실행
docker exec "$REDIS_CONTAINER" redis-cli "$@"