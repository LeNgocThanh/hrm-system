import { Controller, Post, Body, UseGuards, Get, Request, Res, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Response } from 'express';
import { group } from 'console';

export class LoginDto {
  username: string;
  password: string;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.login(loginDto.username, loginDto.password);

    // Đặt refresh_token vào HttpOnly cookie
    response.cookie('refreshToken', result.refresh_token, {
      httpOnly: true, // Không thể truy cập bằng JavaScript phía client
      secure: process.env.NODE_ENV === 'production', // Chỉ gửi qua HTTPS trong môi trường production
      sameSite: 'lax', // Bảo vệ chống lại CSRF ở mức độ vừa phải
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Thời gian hết hạn của cookie (ví dụ: 7 ngày)
      path: '/', // Cookie có sẵn trên toàn bộ domain
    });

    response.cookie('accessToken', result.access_token, {
      httpOnly: true, // Không thể truy cập bằng JavaScript phía client
      secure: process.env.NODE_ENV === 'production', // Chỉ gửi qua HTTPS trong môi trường production
      sameSite: 'lax', // Bảo vệ chống lại CSRF ở mức độ vừa phải
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Thời gian hết hạn của cookie (ví dụ: 7 ngày)
      path: '/', // Cookie có sẵn trên toàn bộ domain
    });

    // Trả về access_token và thông tin người dùng cho frontend
    return {
      access_token: result.access_token,
      //refresh_token: result.refresh_token,
      user: result.user,
      scopedPermissions: result.scopedPermissions,
    };
  }

  @Post('refresh')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed' })
  @ApiResponse({ status: 401, description: 'Invalid or missing refresh token' })
  async refresh(@Request() req, @Res({ passthrough: true }) response: Response) {
    const refreshTokenFromCookie = req.cookies?.refreshToken;    
    if (!refreshTokenFromCookie) {
      throw new UnauthorizedException('Refresh token not found');
    }

    try {
      
      const decodedRefreshToken = await this.authService.validateRefreshToken(refreshTokenFromCookie);      
      const result = await this.authService.refreshToken(decodedRefreshToken.sub, decodedRefreshToken.accountId); 
      // Cập nhật refresh token trong HttpOnly cookie (nếu có refresh token mới)
     response.cookie('accessToken', result.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: new Date(Date.now() + 2 * 60 * 60 * 1000), 
      }); 

      response.cookie('refreshToken', result.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 
        path: '/',
      });

      return { access_token: result.access_token };
    } catch (error) {
      // Xóa refresh token không hợp lệ và ném lỗi
      response.clearCookie('accessToken');
      response.clearCookie('refreshToken');
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  @Post('logout')
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
//  @ApiBearerAuth()
  async logout(@Res({ passthrough: true }) response: Response) {
    // Xóa refresh token cookie khi logout
    response.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    response.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return { message: 'Logout successful' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  getProfile(@Request() req) {
    return req.user;
  }
}
