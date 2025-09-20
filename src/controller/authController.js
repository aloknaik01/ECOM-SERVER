import ErrorHandler from "../middlewares/errorMiddleware.js";
import { catchError } from "../middlewares/catchError.js";
import database from "../db/db.js";
import bcrypt from "bcrypt";
import { sendToken } from "../utils/jwtToken.js";
import { generateResetPasswordToken } from "../utils/generateResetPasswordToken.js";
import { generateResetPasswordEmailTemplate } from "../utils/generateResetPasswordEmailTemplate.js";
import { sendEmail } from "../utils/sendEmail.js";

//register
export const register = catchError(async (req, res, next) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return next(new ErrorHandler("All fields are required!", 400));
  }

  const isRegister = await database.query(
    `SELECT * FROM users WHERE email = $1`,
    [email]
  );

  if (isRegister.rows.length > 0) {
    return next(
      new ErrorHandler("User already registered with this email.", 400)
    );
  }

  const hashedPassword = await bcrypt.hash(String(password), Number(10));

  const user = await database.query(
    `INSERT INTO users (name, email, password) values($1, $2, $3) RETURNING *`,
    [name, email, hashedPassword]
  );

  sendToken(user.rows[0], 201, "User registered successfully", res);
});

//login
export const login = catchError(async (req, res, next) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return next(new ErrorHandler("email and password is required!", 400));
  }

  const user = await database.query(`SELECT * FROM users WHERE email=$1`, [
    email,
  ]);

  if (user.rows.length === 0) {
    return next(new ErrorHandler("Invalid email and password", 401));
  }

  const isPassMatch = await bcrypt.compare(password, user.rows[0].password);

  if (!isPassMatch) {
    return next(new ErrorHandler("Invalid email and password", 401));
  }

  sendToken(user.rows[0], 200, "logged in", res);
});

//get user
export const getUser = catchError(async (req, res, next) => {
  const { user } = req;

  res.status(200).json({
    success: true,
    user,
  });
});

//logout
export const logout = catchError(async (req, res, next) => {
  res
    .status(200)
    .cookie("token", null, {
      expires: new Date(Date.now()),
      httpOnly: true,
    })
    .json({
      success: true,
      message: "Logged out successfully. ",
    });
});

//forgot password
export const forgotPassword = catchError(async (req, res, next) => {
  const { email } = req.body || {};
  const { frontend_url } = req.query;

  let userResult = await database.query(
    `SELECT * FROM users WHERE email = $1`,
    [email]
  );

  if (userResult.rows.length === 0) {
    return next(new ErrorHandler("Invalid email!", 404));
  }

  const user = userResult.rows[0];

  console.log("working ");
  const { hashedToken, resetToken, resetPasswordExpireTime } =
    generateResetPasswordToken();

  console.log("still");
  await database.query(
    `UPDATE users SET   reset_password_token = $1, reset_password_expires = to_timestamp($2) WHERE email = $3 `,
    [hashedToken, resetPasswordExpireTime / 1000, email]
  );

  console.log("still 2");

  const resetPasswordUrl = `${frontend_url}/password/forgot/${resetToken}`;

  console.log("still 3");
  const messages = generateResetPasswordEmailTemplate(resetPasswordUrl);

  console.log("still 4");

  try {
    await sendEmail({
      email: user.email,
      subject: "ShopSphere Password Recovery",
      messages,
    });

    res.status(200).json({
      success: true,
      message: `Email send to ${user.email} successfully`,
    });
  } catch (error) {
    `UPDATE users  SET reset_password_token = NULL , reset_password_expires = NULL, WHERE email = $1`,
      [email];

    return next(new ErrorHandler("Email cannot be sent", 500));
  }
});

// export const forgotPassword = catchError(async (req, res, next) => {
//   const { email } = req.body || {};
//   const { frontend_url } = req.query;

//   const userResult = await database.query(
//     `SELECT * FROM users WHERE email = $1`,
//     [email]
//   );

//   if (userResult.rows.length === 0) {
//     return next(new ErrorHandler("Invalid email!", 404));
//   }

//   const user = userResult.rows[0];

//   const { hashedToken, resetToken, resetPasswordExpireTime } =
//     generateResetPasswordToken();

//   await database.query(
//     `UPDATE users SET reset_password_token = $1, reset_password_expires = to_timestamp($2) WHERE email = $3`,
//     [hashedToken, resetPasswordExpireTime / 1000, email]
//   );

//   const resetPasswordUrl = `${frontend_url}/password/forgot/${resetToken}`;
//   const message = generateResetPasswordEmailTemplate(resetPasswordUrl);

//   try {
//     await sendEmail({
//       email: user.email,
//       subject: "ShopSphere Password Recovery",
//       html: message,
//     });

//     res.status(200).json({
//       success: true,
//       message: `Email sent to ${user.email} successfully`,
//     });
//   } catch (error) {
//     await database.query(
//       `UPDATE users SET reset_password_token = NULL, reset_password_expires = NULL WHERE email = $1`,
//       [email]
//     );
//     return next(new ErrorHandler("Email cannot be sent", 500));
//   }
// });
