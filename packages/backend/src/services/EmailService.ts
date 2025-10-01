export class EmailService {
  // Minimal email service stub for build-time safety. Replace with a real SMTP implementation when ready.
  async sendAlertEmail(to: string, symbol: string, message: string): Promise<boolean> {
    try {
      console.log('[EmailService] sendAlertEmail', { to, symbol, message });
      // TODO: integrate real SMTP provider using config.email
      return true;
    } catch (err) {
      console.error('[EmailService] Failed to send alert email', err);
      return false;
    }
  }
}

