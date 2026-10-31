import assert from "node:assert/strict";
import test from "node:test";
import { errorHandler } from "../src/middleware/errorHandler.js";
import { AppError } from "../src/utils/AppError.js";

function invokeErrorHandler(error) {
  const response = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  errorHandler(error, { path: "/test", method: "GET" }, response, () => {});
  return response;
}

test("production error responses omit stack and hide internal 5xx messages", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";

  try {
    const clientError = invokeErrorHandler(
      new AppError("شماره موبایل یا رمز عضویت درست نیست", 400, "INVALID_CREDENTIALS"),
    );
    assert.equal(clientError.statusCode, 400);
    assert.deepEqual(clientError.body, {
      message: "شماره موبایل یا رمز عضویت درست نیست",
      code: "INVALID_CREDENTIALS",
    });
    assert.equal("stack" in clientError.body, false);

    const serverError = invokeErrorHandler(
      new AppError("secret database connection details", 503, "DATABASE_UNAVAILABLE"),
    );
    assert.equal(serverError.statusCode, 503);
    assert.deepEqual(serverError.body, {
      message: "خطایی در سرور رخ داد.",
      code: "DATABASE_UNAVAILABLE",
    });
    assert.equal("stack" in serverError.body, false);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});
