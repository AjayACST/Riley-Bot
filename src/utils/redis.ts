import { AsyncRedis } from "async-redis";
import * as redis from "redis";

import { redisIP, redisPort, redisPassword } from "../../config.json";

export const clientRedisNoAsync = redis.createClient({
  host: redisIP,
  port: redisPort,
  auth_pass: redisPassword,
});

export const clientRedis = AsyncRedis.decorate(clientRedisNoAsync);

clientRedis.on("error", function (error: any) {
  console.error(error);
});
