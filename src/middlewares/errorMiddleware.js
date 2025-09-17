class ErrorHandler extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function errorMiddleware(err, req, res, next) {
  err.message = err.message || "Internal Server Error";
  err.statusCode = err.statusCode || 500;

  if (err.statusCode == 11000) {
    const message = `Duplicate field value Entered`;
    err = new ErrorHandler(message, 400);
  }

  if (err.name == "JsonWebTokenError") {
    const message = "Json web token is invalid , try again!";
    err = new ErrorHandler(message, 400);
  }
  if (err.name == "TokenExpiredError") {
    const message = "Json web token has expired , try again!";
    err = new ErrorHandler(message, 400);
  }

  const errorMessage = err.errors
    ? Object.values(err.errors)
        .map((error) => error.message)
        .join(" ")
    : err.message;

  return res.status(err.statusCode).json({
    success: false,
    errorMessage,
  });
}
export default ErrorHandler;
