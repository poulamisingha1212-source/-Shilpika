import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: any) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, requestId } = req;
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          this.logger.log(
            `${method} ${url} ${res.statusCode} ${Date.now() - now}ms`,
            { context: "HTTP", requestId }
          );
        },
        error: (err) => {
          this.logger.error(`${method} ${url} ERROR ${Date.now() - now}ms: ${err.message}`, {
            context: "HTTP",
            requestId,
          });
        },
      })
    );
  }
}
