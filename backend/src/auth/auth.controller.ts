import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService, RequestPilotDto } from './auth.service';
import { Public } from './public.decorator';

@ApiTags('Authentication & Onboarding')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('request-pilot')
  @ApiOperation({
    summary: 'Self-serve pilot workspace registration & business onboarding',
    description:
      'Creates a dedicated tenant workspace, initializes standard reconciliation rules, and returns credentials.',
  })
  async requestPilot(@Body() dto: RequestPilotDto) {
    return await this.authService.requestPilotWorkspace(dto);
  }
}
