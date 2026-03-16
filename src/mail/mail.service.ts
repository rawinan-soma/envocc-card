import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectQueue('email') private emailQueue: Queue,
  ) {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendResetPasswordEmail(email: string, token: string) {
    await this.emailQueue.add('reset-password', {
      email,
      token,
    });
    this.logger.log(`Added reset password email job for ${email} to queue`);
  }

  async sendResetPasswordEmailActual(email: string, token: string) {
    const from =
      this.configService.get<string>('MAIL_FROM') ||
      this.configService.get<string>('SMTP_USER') ||
      'noreply@example.com';
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/resetpassword?token=${token}`;

    try {
      await this.transporter.sendMail({
        from: `EnvOcc_Card <${from}>`,
        to: email,
        subject: 'รีเซ็ตรหัสผ่าน เว็บไซต์ EnvOcc_Card',
        text: `คลิกลิงก์เพื่อรีเซ็ตรหัสผ่าน: ${resetLink}`,
        html: ` <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
               <h2 style="color: #8753d5; font-size: 24px;">รีเซ็ตรหัสผ่านของคุณ</h2>
               <p>สวัสดีค่ะ</p>
               <p>คุณสามารถรีเซ็ตรหัสผ่านของคุณได้โดยคลิกที่ปุ่มด้านล่าง</p>
               <div style="text-align: center; margin: 20px 0;">
               <a href="${resetLink}" style="background-color: #8753d5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                   รีเซ็ตรหัสผ่าน
               </a>
               </div>
               <p style="font-size: 14px; color: #666;">หากคุณไม่ได้เป็นผู้ร้องขอ โปรดเพิกเฉยต่ออีเมลฉบับนี้</p>
               <p style="font-size: 12px; color: #999;">ลิงก์นี้จะหมดอายุใน 5 นาที</p>
               <hr style="margin-top: 30px; border: none; border-top: 1px solid #ccc;" />
               <p style="font-size: 12px; color: #999; text-align: center;">
               อีเมลฉบับนี้ถูกส่งโดยระบบอัตโนมัติจากเว็บไซต์ EnvOcc_card กรุณาอย่าตอบกลับ<br/>
               หากคุณมีคำถาม กรุณาติดต่อ 02-590-3867
               </p>
           </div>`,
      });
      this.logger.log(`Reset password email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${email}`, error);
      throw error;
    }
  }
}
