import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserAccountsService } from '../../user-accounts/user-accounts.service';
import { JwtPayload } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private userAccountsService: UserAccountsService) {    
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req) => req.cookies?.['accessToken'],
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key',
    });
  }

  async validate(payload: JwtPayload) {
    // Find account by userId and populate user data
    const account = await this.userAccountsService.findByUserId(payload.sub);
    if (!account || account.status !== 'active') {
      throw new UnauthorizedException();
    }

    // Return user data for request.user
    return {
      userId: payload.sub,
      username: account.username,
      email: payload.email,
      fullName: payload.fullName,
      roles: payload.roles ?? [],
    };
  }
}
