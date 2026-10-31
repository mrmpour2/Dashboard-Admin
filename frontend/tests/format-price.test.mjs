import test from "node:test";
import assert from "node:assert/strict";
import { formatPrice } from "../src/utils/formatPrice.js";

test("formats monetary values by locale without changing numeric inputs", () => {
  assert.equal(formatPrice(0), "۰ تومان");
  assert.equal(formatPrice(1234567890), "۱٬۲۳۴٬۵۶۷٬۸۹۰ تومان");
  assert.equal(formatPrice(12.5), "۱۲٫۵ تومان");
  assert.equal(formatPrice(null), "—");
  assert.equal(formatPrice("", "en-US"), "—");
  assert.equal(formatPrice(1234, "en-US"), "1,234 Toman");
});
