// src/lib/emails/templates/passwordResetTemplate.ts
export function passwordResetTemplate(name: string, resetLink: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; }
          .content { padding: 20px 0; }
          .button { display: inline-block; background-color: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { color: #999; font-size: 12px; text-align: center; padding-top: 20px; border-top: 1px solid #eee; }
          .warning { background-color: #fff3cd; padding: 12px; border-radius: 4px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
          </div>
          
          <div class="content">
            <p>Hi ${name},</p>
            
            <p>We received a request to reset your WheelRent account password. Click the button below to create a new password:</p>
            
            <div style="text-align: center;">
              <a href="${resetLink}" class="button">Reset Password</a>
            </div>
            
            <p style="text-align: center; color: #666;">
              Or copy and paste this link in your browser:<br>
              <a href="${resetLink}" style="word-break: break-all; color: #0066cc;">
                ${resetLink}
              </a>
            </p>
            
            <div class="warning">
              <strong>⏰ Important:</strong> This link will expire in 1 hour for security reasons.
            </div>
            
            <p>If you didn't request a password reset, please ignore this email or contact our support team.</p>
            
            <p>Best regards,<br>WheelRent Team</p>
          </div>
          
          <div class="footer">
            <p>© 2026 WheelRent. All rights reserved.</p>
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function passwordResetTemplateAr(
  name: string,
  resetLink: string,
): string {
  return `
    <!DOCTYPE html>
    <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; }
          .content { padding: 20px 0; }
          .button { display: inline-block; background-color: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { color: #999; font-size: 12px; text-align: center; padding-top: 20px; border-top: 1px solid #eee; }
          .warning { background-color: #fff3cd; padding: 12px; border-radius: 4px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 طلب إعادة تعيين كلمة المرور</h1>
          </div>
          
          <div class="content">
            <p>مرحباً ${name},</p>
            
            <p>لقد تلقينا طلباً لإعادة تعيين كلمة مرور حسابك في ويل رينت. انقر على الزر أدناه لإنشاء كلمة مرور جديدة:</p>
            
            <div style="text-align: center;">
              <a href="${resetLink}" class="button">إعادة تعيين كلمة المرور</a>
            </div>
            
            <p style="text-align: center; color: #666;">
              أو انسخ والصق هذا الرابط في متصفحك:<br>
              <a href="${resetLink}" style="word-break: break-all; color: #0066cc;">
                ${resetLink}
              </a>
            </p>
            
            <div class="warning">
              <strong>⏰ مهم:</strong> سينتهي صلاحية هذا الرابط خلال ساعة واحدة لأسباب أمنية.
            </div>
            
            <p>إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا البريد أو الاتصال بفريق الدعم لدينا.</p>
            
            <p>مع أطيب التحيات،<br>فريق ويل رينت</p>
          </div>
          
          <div class="footer">
            <p>© 2026 WheelRent. جميع الحقوق محفوظة.</p>
            <p>هذا بريد إلكتروني آلي، يرجى عدم الرد عليه.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
