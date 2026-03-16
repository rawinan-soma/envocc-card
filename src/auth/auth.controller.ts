import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('reset-password')
  async resetPasswordHandler(
    @Body('token') token: string,
    @Body('newPass') newPass: string,
  ) {
    return this.authService.resetPassword(token, newPass);
  }
}
