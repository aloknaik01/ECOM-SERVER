import crypto from "crypto";

const generateResetPasswordToken = () => {
  const resetToken = crypto.randomBytes(20).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const resetPasswordExpireTime = Date.now() + 5 * 60 * 1000; //5 minutes
  return {
    resetToken,
    hashedToken,
    resetPasswordExpireTime,
  };
};
