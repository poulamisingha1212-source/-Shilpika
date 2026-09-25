import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

/**
 * Auth0/JWT Strategy
 *
 * In production: validates Auth0 JWKS RS256 tokens via jwks-rsa.
 * In development: validates symmetric HS256 JWT tokens using JWT_SECRET.
 *
 * The strategy is always initialized with a static config.
 * Auth0 JWKS is used when AUTH0_DOMAIN + NODE_ENV=production are set.
 */

function buildOptions(configService: ConfigService): any {
  const domain = configService.get<string>('AUTH0_DOMAIN', '');
  const audience = configService.get<string>('AUTH0_AUDIENCE', '');
  const jwtSecret = configService.get<string>('JWT_SECRET', 'dev-secret');
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  if (domain && nodeEnv === 'production') {
    // Production: use Auth0 JWKS
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { passportJwtSecret } = require('jwks-rsa');
    return {
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://${domain}/.well-known/jwks.json`,
      }),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      audience,
      issuer: `https://${domain}/`,
      algorithms: ['RS256'],
    };
  }

  // Development: use symmetric JWT
  return {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    ignoreExpiration: true,
    secretOrKey: jwtSecret,
  };
}

@Injectable()
export class Auth0Strategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService, private authService: AuthService) {
    super(buildOptions(configService));
  }

  async validate(payload: any) {
    const user = await this.authService.validateJwtPayload(payload);
    if (!user) throw new UnauthorizedException('Invalid token');
    return user;
  }
}
