export interface PaymentReceiptParams {
  username: string;
  amount: string;
  referenceCode: string;
  paymentMethodType: string;
  paidAt: string;
}

export function generatePaymentReceiptEmail(
  params: PaymentReceiptParams,
): { subject: string; html: string } {
  const { username, amount, referenceCode, paymentMethodType, paidAt } = params;

  const subject = 'Payment Receipt Confirmation';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Receipt</title>
</head>
<body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #2c3e50;">Payment Receipt Confirmation</h2>
  <p>Hello <strong>${username}</strong>,</p>
  <p>Your payment has been successfully confirmed. Here are the details:</p>
  <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
    <tr>
      <td style="padding: 8px 12px; border: 1px solid #ddd; font-weight: bold; background: #f9f9f9;">Amount</td>
      <td style="padding: 8px 12px; border: 1px solid #ddd;">${amount}</td>
    </tr>
    <tr>
      <td style="padding: 8px 12px; border: 1px solid #ddd; font-weight: bold; background: #f9f9f9;">Reference Code</td>
      <td style="padding: 8px 12px; border: 1px solid #ddd;">${referenceCode}</td>
    </tr>
    <tr>
      <td style="padding: 8px 12px; border: 1px solid #ddd; font-weight: bold; background: #f9f9f9;">Payment Method</td>
      <td style="padding: 8px 12px; border: 1px solid #ddd;">${paymentMethodType}</td>
    </tr>
    <tr>
      <td style="padding: 8px 12px; border: 1px solid #ddd; font-weight: bold; background: #f9f9f9;">Paid At</td>
      <td style="padding: 8px 12px; border: 1px solid #ddd;">${paidAt}</td>
    </tr>
  </table>
  <p>Thank you for your contribution!</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
  <p style="font-size: 12px; color: #999;">This is an automated message. Please do not reply to this email.</p>
</body>
</html>`;

  return { subject, html };
}
