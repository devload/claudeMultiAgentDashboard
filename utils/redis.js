const redis = require('redis');
const debug = require('debug')('claudeauto:redis');

// Redis 클라이언트 설정
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const USE_REDIS = process.env.USE_REDIS !== 'false'; // 기본값 true

let client = null;
let pubClient = null;
let subClient = null;

// Redis 클라이언트 초기화
async function initRedis() {
  if (!USE_REDIS) {
    debug('Redis is disabled. Using file system mode.');
    return false;
  }

  try {
    // 메인 클라이언트
    client = redis.createClient({ url: REDIS_URL });
    
    // Pub/Sub용 클라이언트 (별도 연결 필요)
    pubClient = client.duplicate();
    subClient = client.duplicate();

    // 에러 핸들러
    client.on('error', err => debug('Redis Client Error:', err));
    pubClient.on('error', err => debug('Redis Pub Client Error:', err));
    subClient.on('error', err => debug('Redis Sub Client Error:', err));

    // 연결
    await client.connect();
    await pubClient.connect();
    await subClient.connect();

    debug('Redis clients connected successfully');
    return true;
  } catch (error) {
    console.error('Failed to connect to Redis:', error.message);
    console.log('Falling back to file system mode');
    return false;
  }
}

// 작업 큐 함수들
const taskQueue = {
  // 작업 추가
  async push(agentName, task) {
    if (!client) return false;
    try {
      await client.lPush(`tasks:${agentName}`, JSON.stringify({
        task,
        timestamp: new Date().toISOString()
      }));
      await pubClient.publish('channel:tasks', JSON.stringify({
        type: 'task_added',
        agent: agentName,
        task
      }));
      return true;
    } catch (error) {
      debug('Error pushing task:', error);
      return false;
    }
  },

  // 작업 가져오기 (논블로킹)
  async pop(agentName) {
    if (!client) return null;
    try {
      const result = await client.rPop(`tasks:${agentName}`);
      return result ? JSON.parse(result) : null;
    } catch (error) {
      debug('Error popping task:', error);
      return null;
    }
  },

  // 작업 큐 길이
  async length(agentName) {
    if (!client) return 0;
    try {
      return await client.lLen(`tasks:${agentName}`);
    } catch (error) {
      debug('Error getting queue length:', error);
      return 0;
    }
  },

  // 모든 작업 조회 (삭제하지 않음)
  async list(agentName) {
    if (!client) return [];
    try {
      const tasks = await client.lRange(`tasks:${agentName}`, 0, -1);
      return tasks.map(t => JSON.parse(t));
    } catch (error) {
      debug('Error listing tasks:', error);
      return [];
    }
  }
};

// 로그 스트림 함수들
const logStream = {
  // 로그 추가
  async add(agentName, message) {
    if (!client) return false;
    try {
      const id = await client.xAdd(`logs:${agentName}`, '*', {
        message,
        timestamp: new Date().toISOString()
      });
      
      await pubClient.publish('channel:logs', JSON.stringify({
        type: 'log_added',
        agent: agentName,
        message,
        id
      }));
      
      return id;
    } catch (error) {
      debug('Error adding log:', error);
      return false;
    }
  },

  // 최신 로그 읽기
  async readLatest(agentName, count = 100) {
    if (!client) return [];
    try {
      const logs = await client.xRevRange(`logs:${agentName}`, '+', '-', { COUNT: count });
      return logs.map(([id, fields]) => ({
        id,
        message: fields.message,
        timestamp: fields.timestamp
      }));
    } catch (error) {
      debug('Error reading logs:', error);
      return [];
    }
  },

  // 특정 ID 이후의 로그 읽기 (실시간 스트리밍용)
  async readSince(agentName, lastId = '0') {
    if (!client) return [];
    try {
      const logs = await client.xRead({ key: `logs:${agentName}`, id: lastId }, { COUNT: 1000 });
      if (!logs || logs.length === 0) return [];
      
      return logs[0].messages.map(([id, fields]) => ({
        id,
        message: fields.message,
        timestamp: fields.timestamp
      }));
    } catch (error) {
      debug('Error reading logs since:', error);
      return [];
    }
  }
};

// 에이전트 상태 관리
const agentStatus = {
  // 상태 업데이트
  async update(agentName, status, additionalInfo = {}) {
    if (!client) return false;
    try {
      const data = {
        status,
        lastUpdate: new Date().toISOString(),
        ...additionalInfo
      };
      
      await client.hSet(`agent:${agentName}:status`, data);
      
      await pubClient.publish('channel:status', JSON.stringify({
        type: 'status_update',
        agent: agentName,
        ...data
      }));
      
      return true;
    } catch (error) {
      debug('Error updating status:', error);
      return false;
    }
  },

  // 상태 조회
  async get(agentName) {
    if (!client) return null;
    try {
      return await client.hGetAll(`agent:${agentName}:status`);
    } catch (error) {
      debug('Error getting status:', error);
      return null;
    }
  },

  // 모든 에이전트 상태 조회
  async getAll() {
    if (!client) return {};
    try {
      const agents = await registry.list();
      const statuses = {};
      
      for (const agent of agents) {
        statuses[agent] = await this.get(agent);
      }
      
      return statuses;
    } catch (error) {
      debug('Error getting all statuses:', error);
      return {};
    }
  }
};

// 에이전트 레지스트리
const registry = {
  // 에이전트 등록
  async register(agentName, config) {
    if (!client) return false;
    try {
      await client.hSet('registry:agents', agentName, JSON.stringify(config));
      return true;
    } catch (error) {
      debug('Error registering agent:', error);
      return false;
    }
  },

  // 에이전트 정보 조회
  async get(agentName) {
    if (!client) return null;
    try {
      const data = await client.hGet('registry:agents', agentName);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      debug('Error getting agent info:', error);
      return null;
    }
  },

  // 모든 에이전트 목록
  async list() {
    if (!client) return [];
    try {
      return await client.hKeys('registry:agents');
    } catch (error) {
      debug('Error listing agents:', error);
      return [];
    }
  },

  // 에이전트 삭제
  async unregister(agentName) {
    if (!client) return false;
    try {
      await client.hDel('registry:agents', agentName);
      return true;
    } catch (error) {
      debug('Error unregistering agent:', error);
      return false;
    }
  }
};

// 명령어 히스토리
const commandHistory = {
  // 명령어 추가
  async add(agentName, command, from = 'user') {
    if (!client) return false;
    try {
      const timestamp = Date.now();
      const data = {
        agent: agentName,
        command,
        from,
        timestamp: new Date().toISOString()
      };
      
      await client.zAdd('history:commands', {
        score: timestamp,
        value: JSON.stringify(data)
      });
      
      // 오래된 히스토리 자동 삭제 (30일)
      const thirtyDaysAgo = timestamp - (30 * 24 * 60 * 60 * 1000);
      await client.zRemRangeByScore('history:commands', 0, thirtyDaysAgo);
      
      return true;
    } catch (error) {
      debug('Error adding command history:', error);
      return false;
    }
  },

  // 최근 명령어 조회
  async getRecent(count = 100) {
    if (!client) return [];
    try {
      const commands = await client.zRange('history:commands', -count, -1, { REV: true });
      return commands.map(cmd => JSON.parse(cmd));
    } catch (error) {
      debug('Error getting command history:', error);
      return [];
    }
  }
};

// Pub/Sub 구독 헬퍼
const pubsub = {
  // 채널 구독
  async subscribe(channels, callback) {
    if (!subClient) return false;
    try {
      await subClient.subscribe(channels, (message, channel) => {
        try {
          const data = JSON.parse(message);
          callback(channel, data);
        } catch (error) {
          debug('Error parsing message:', error);
          callback(channel, message);
        }
      });
      return true;
    } catch (error) {
      debug('Error subscribing:', error);
      return false;
    }
  },

  // 메시지 발행
  async publish(channel, data) {
    if (!pubClient) return false;
    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      await pubClient.publish(channel, message);
      return true;
    } catch (error) {
      debug('Error publishing:', error);
      return false;
    }
  }
};

// 유틸리티 함수
const utils = {
  // Redis 연결 상태 확인
  isConnected() {
    return client && client.isOpen;
  },

  // Redis 사용 여부
  isEnabled() {
    return USE_REDIS;
  },

  // 정리
  async cleanup() {
    if (client) await client.quit();
    if (pubClient) await pubClient.quit();
    if (subClient) await subClient.quit();
  }
};

// Redis 클라이언트 메소드들을 직접 노출
const redisClient = {
  // 기본 Redis 명령어들
  async keys(pattern) {
    if (!client) return [];
    return client.keys(pattern);
  },
  
  async exists(key) {
    if (!client) return 0;
    return client.exists(key);
  },
  
  async hgetall(key) {
    if (!client) return {};
    return client.hGetAll(key);
  },
  
  async hset(key, field, value) {
    if (!client) return null;
    return client.hSet(key, field, value);
  },
  
  async hmset(key, obj) {
    if (!client) return null;
    return client.hSet(key, obj);
  },
  
  async lpush(key, value) {
    if (!client) return null;
    return client.lPush(key, value);
  },
  
  async rpop(key) {
    if (!client) return null;
    return client.rPop(key);
  },
  
  async lrange(key, start, stop) {
    if (!client) return [];
    return client.lRange(key, start, stop);
  },
  
  async publish(channel, message) {
    if (!pubClient) return null;
    return pubClient.publish(channel, message);
  },
  
  async subscribe(channel, callback) {
    if (!subClient) return null;
    return subClient.subscribe(channel, callback);
  }
};

// 내보내기
module.exports = {
  ...redisClient,
  initRedis,
  taskQueue,
  logStream,
  agentStatus,
  registry,
  commandHistory,
  pubsub,
  utils,
  
  // 직접 클라이언트 접근 (고급 사용)
  getClients: () => ({ client, pubClient, subClient })
};