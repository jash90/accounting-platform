import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private redis: Redis;
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(private configService: ConfigService) {
    const redisUrl = this.configService.get('REDIS_URL', 'redis://localhost:6379');
    this.redis = new Redis(redisUrl);

    this.windowMs = this.configService.get('RATE_LIMIT_WINDOW', 60000); // 1 minute
    this.maxRequests = this.configService.get('RATE_LIMIT_MAX_REQUESTS', 100);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      // Allow unauthenticated requests but with stricter limits
      return true;
    }

    const key = `rate-limit:${user.id}`;
    const current = await this.redis.incr(key);

    if (current === 1) {
      // First request in window, set expiration
      await this.redis.pexpire(key, this.windowMs);
    }

    if (current > this.maxRequests) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests, please try again later',
          retryAfter: Math.ceil(this.windowMs / 1000)
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    return true;
  }
}
