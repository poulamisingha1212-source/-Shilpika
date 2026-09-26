import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

export enum Role {
  ARTISAN = "artisan",
  BUYER = "buyer",
  ADMIN = "admin",
}

export const ROLES_KEY = "roles";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    const rawRoles: (string | undefined)[] = [
      user.role,
      ...(Array.isArray(user.roles) ? user.roles : user.roles ? [user.roles] : []),
      ...(Array.isArray(user["https://artisan-marketplace.api/roles"])
        ? user["https://artisan-marketplace.api/roles"]
        : user["https://artisan-marketplace.api/roles"]
        ? [user["https://artisan-marketplace.api/roles"]]
        : []),
      user["https://artisan-marketplace.api/role"],
    ];

    const userRoles = rawRoles
      .filter((r): r is string => typeof r === "string")
      .map((r) => r.toLowerCase().trim());

    return requiredRoles.some((role) => userRoles.includes(role.toLowerCase()));
  }
}
