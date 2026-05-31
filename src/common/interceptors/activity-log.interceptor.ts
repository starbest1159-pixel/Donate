import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ActivityLogInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { id?: number } | undefined;
    const method = request.method;
    const url = request.url;
    const ipAddress = request.ip || request.connection?.remoteAddress;

    return next.handle().pipe(
      tap({
        next: () => {
          if (user?.id) {
            const action = `${method} ${url}`;
            this.prisma.activityLog
              .create({
                data: {
                  userId: user.id,
                  action,
                  ipAddress: ipAddress || null,
                  details: null,
                },
              })
              .catch((error: Error) => {
                this.logger.error(
                  `Failed to create activity log: ${error.message}`,
                );
              });
          }
        },
      }),
    );
  }
}
