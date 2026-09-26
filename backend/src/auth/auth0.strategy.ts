import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import * as jwt from 'jsonwebtoken';

/**
 * Auth0 / JWT Strategy
 *
 * Validates Auth0 JWKS RS256 tokens via jwks-rsa when present,
 * and seamlessly validates symmetric HS256 tokens using JWT_SECRET.
 *
 * Enforces token expiration checks in all modes.
 */
function buildOptions(configService: ConfigService): any {
  const domain = configService.get<string>('AUTH0_DOMAIN', 'dev-3c8eme7wlzr31szt.us.auth0.com');
  const jwtSecret = configService.get<string>('JWT_SECRET', 'dev-secret');

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { passportJwtSecret } = require('jwks-rsa');

  const jwksProvider = domain && domain !== 'your-tenant.auth0.com'
    ? passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        jwksUri: `https://${domain}/.well-known/jwks.json`,
      })
    : null;

  return {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKeyProvider: (request: any, rawJwtToken: string, done: (err: any, secret?: any) => void) => {
      try {
        const decoded = jwt.decode(rawJwtToken, { complete: true }) as any;
        if (!decoded) {
          return done(new UnauthorizedException('Invalid JWT format'), undefined);
        }
        // If RS256 signed by Auth0 JWKS, use Auth0 key provider
        if (decoded.header && decoded.header.alg === 'RS256' && jwksProvider) {
          return jwksProvider(request, rawJwtToken, done);
        }
        // Otherwise, resolve via local secret
        return done(null, jwtSecret);
      } catch (err) {
        return done(err, undefined);
      }
    },
    algorithms: ['RS256', 'HS256'],
    ignoreExpiration: false,
  };
}

@Injectable()
export class Auth0Strategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService, private authService: AuthService) {
    super(buildOptions(configService));
  }

  async validate(payload: any) {
    const user = await this.authService.validateJwtPayload(payload);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
    return user;
  }
}

