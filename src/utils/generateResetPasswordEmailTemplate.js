const generateResetPasswordEmailTemplate = (username, reserPasswordUrl) => {
  return;
  `
   <div style="margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; padding: 20px; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); overflow: hidden;">
        <div style="text-align: center; padding: 40px 30px 30px; background-color: #ffffff;">
            <div style="font-size: 48px; font-weight: bold; color: #f56400; font-family: 'Georgia', serif; letter-spacing: -1px;">ShopSphere</div>
        </div>
        
        <div style="padding: 20px 40px 40px; text-align: center;">
            <div style="font-size: 24px; color: #333; margin-bottom: 30px; font-weight: 400;">
                Hi <span style="background-color: #e8e8e8; padding: 2px 6px; border-radius: 3px; font-weight: 500;">${username}</span>, let's reset your password.
            </div>
            
            <a href="${reserPasswordUrl}" style="display: inline-block; background-color: #f56400; color: white; padding: 14px 28px; text-decoration: none; border-radius: 4px; font-size: 16px; font-weight: 600; margin: 20px 0 30px;">Reset Your Password</a>
            
            <div style="font-size: 14px; color: #666; line-height: 1.5; margin-bottom: 15px;">
                If the above button does not work for you, copy and paste the following into your browser's address bar or click the url path:
            </div>
            
            <a href="#" style="font-size: 14px; color: #1e88e5; text-decoration: none; word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px; display: inline-block; margin: 10px 0 20px; border: 1px solid #e1e5e9;">
              ${reserPasswordUrl}
            </a>
            
            <div style="font-size: 14px; color: #666; line-height: 1.4;">
                If you didn't ask to reset your password, you can disregard this email.
            </div>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #e1e5e9;">
            This email was sent to you by ShopSphere. If you have any questions, please contact our support team.
        </div>
    </div>
</div>
    `;
};
