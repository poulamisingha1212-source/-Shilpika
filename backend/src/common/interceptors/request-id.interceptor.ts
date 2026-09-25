import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    const requestId = (req.headers["x-request-id"] as string) || uuidv4();
    req.headers["x-request-id"] = requestId;
    req.requestId = requestId;
    res.setHeader("X-Request-ID", requestId);

    return next.handle();
  }
}
