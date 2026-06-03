import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as SendGrid from '@sendgrid/mail';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly mailFrom: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    this.mailFrom = this.configService.get<string>('MAIL_FROM') || '';

    if (apiKey) {
      SendGrid.setApiKey(apiKey);
    } else {
      this.logger.warn('SENDGRID_API_KEY is not configured; emails will not be sent');
    }
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      await SendGrid.send({
        to,
        from: this.mailFrom,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${to}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
