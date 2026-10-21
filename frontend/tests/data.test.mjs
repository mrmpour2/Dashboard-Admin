import test from "node:test";
import assert from "node:assert/strict";
import { normalizeProduct, normalizeReview, normalizeUser, normalizeTicket } from "../src/hooks/api/normalizers.js";
import { readTableState } from "../src/hooks/tableStateUtils.js";
import { generateAvatarDataUri } from "../src/utils/generateAvatar.js";

test("product inventory and decimal prices match API values", () => {
  assert.equal(normalizeProduct({ name: "محصول", price: "123.50", stock: 0 }).status, "ناموجود");
  assert.equal(normalizeProduct({ stock: 3 }).status, "کم‌موجود");
  assert.equal(normalizeProduct({ stock: 10 }).status, "موجود");
  assert.equal(normalizeProduct({ price: "123.50" }).price, 123.5);
});
test("all API user statuses have Persian labels", () => {
  for (const [status, label] of [["ACTIVE", "فعال"], ["INACTIVE", "غیرفعال"], ["SUSPENDED", "مسدود"]]) assert.equal(normalizeUser({ status }).status, label);
});
test("urgent tickets and unassigned tickets remain readable", () => {
  const ticket = normalizeTicket({ title: "پشتیبانی", priority: "URGENT", status: "OPEN", _count: { comments: 3 } });
  assert.equal(ticket.subject, "پشتیبانی");
  assert.equal(ticket.priority, "فوری");
  assert.equal(ticket.messages, 3);
});
test("customer reviews keep an optional rating and the Table Talk flag", () => {
  const approved = normalizeReview({
    authorName: "سارا",
    rating: 5,
    body: "متن نظر",
    productName: "اسموکی اسمش",
    status: "APPROVED",
    featured: true,
    orderVerified: true,
    createdAt: "2026-04-01T10:00:00.000Z",
  });
  assert.equal(approved.author, "سارا");
  assert.equal(approved.status, "تأییدشده");
  assert.equal(approved.statusKey, "APPROVED");
  assert.equal(approved.featured, true);
  assert.equal(approved.product, "اسموکی اسمش");

  const noRating = normalizeReview({ authorName: "", rating: null, status: "PENDING" });
  assert.equal(noRating.rating, null);
  assert.equal(noRating.author, "مهمان");
  assert.equal(noRating.status, "در انتظار بررسی");
  assert.equal(noRating.featured, false);
  assert.equal(noRating.date, "—");
});
test("admin review rows keep the phone, the text and the submission date", () => {
  const row = normalizeReview({
    authorName: "سارا",
    authorPhone: "09123456789",
    body: "متن واقعی نظر",
    productName: "اسموکی اسمش",
    status: "APPROVED",
    featured: true,
    createdAt: "2026-04-01T10:00:00.000Z",
  });
  assert.equal(row.phone, "09123456789");
  assert.equal(row.text, "متن واقعی نظر");
  assert.notEqual(row.date, "—");

  // نظری که شماره/تاریخ ندارد نباید سلول خالی یا «Invalid Date» بسازد.
  const bare = normalizeReview({ authorName: "مهمان", status: "PENDING" });
  assert.equal(bare.phone, "—");
  assert.equal(bare.date, "—");
  assert.equal(bare.text, "");
});
test("URL pagination rejects negative, fractional and infinite values", () => {
  const defaults = { page: 1, pageSize: 10, search: "" };
  for (const value of ["-1", "0", "1.5", "Infinity", "NaN"]) assert.equal(readTableState(new URLSearchParams({ page: value }), defaults).page, 1);
  assert.equal(readTableState(new URLSearchParams("page=2&search=دفتر"), defaults).search, "دفتر");
});
test("generated SVG avatars escape user text and invalid color", () => {
  const svg = decodeURIComponent(generateAvatarDataUri("<&name", 'red\" onload=\"alert(1)').split(",")[1]);
  assert.ok(svg.includes("&lt;&amp;"));
  assert.ok(!svg.includes("onload="));
});
