import test from "node:test";
import assert from "node:assert/strict";
import { createFixture } from "./fixture.mjs";

test("Store API against isolated PostgreSQL schema", async (t) => {
  const fixture = await createFixture();
  const { default: app } = await import("../src/app.js");
  const { prisma } = await import("../src/config/prisma.js");
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  let adminToken,
    staffToken,
    managerToken,
    cookie,
    product,
    coupon,
    order,
    ticket;
  let checkoutNumber = 10000;
  let checkoutHeaders = {};
  async function request(
    path,
    {
      method = "GET",
      body,
      token = adminToken,
      refreshCookie,
      status = 200,
      origin,
    } = {},
  ) {
    // Each commerce case uses a distinct verified synthetic buyer. OTP rejection,
    // verification and abuse limits are tested explicitly by stock.test.mjs.
    if (path === "/payment/orders" && body?.customerPhone) {
      body = { ...body, customerPhone: "0912" + String(++checkoutNumber).padStart(7, "0") };
      checkoutHeaders = fixture.checkoutHeaders(body.customerPhone, `198.51.100.${checkoutNumber % 250}`);
    }
    const response = await fetch(base + path, {
      method,
      headers: {
        ...(path.startsWith("/payment/") ? checkoutHeaders : {}),
        ...(body && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(refreshCookie && { Cookie: refreshCookie }),
        ...(origin && { Origin: origin }),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    assert.equal(response.status, status, `${method} ${path}: ${text}`);
    return { response, data };
  }
  try {
    await t.test(
      "health, CORS, anonymous access and public registration",
      async () => {
        const result = await request("/health");
        assert.equal(result.data.status, "ok");
        assert.ok(result.response.headers.get("x-content-type-options"));
        await request("/health", {
          origin: "https://untrusted.example",
          status: 403,
        });
        await request("/products", { status: 401 });
        await request("/auth/register", {
          method: "POST",
          body: {},
          status: 404,
        });
      },
    );
    await t.test("login, role and full current-user contract", async () => {
      await request("/auth/login", {
        method: "POST",
        body: { email: fixture.admin.email, password: "wrong" },
        status: 401,
      });
      for (const [role, user] of [
        ["admin", fixture.admin],
        ["staff", fixture.staff],
        ["manager", fixture.manager],
      ]) {
        const { data, response } = await request("/auth/login", {
          method: "POST",
          body: { email: user.email, password: fixture.password },
        });
        assert.equal(data.user.name, user.name);
        assert.equal(data.user.passwordHash, undefined);
        if (role === "admin") {
          adminToken = data.accessToken;
          cookie = response.headers.getSetCookie()[0].split(";")[0];
        }
        if (role === "staff") staffToken = data.accessToken;
        if (role === "manager") managerToken = data.accessToken;
      }
      assert.equal(
        (await request("/auth/me")).data.user.email,
        fixture.admin.email,
      );
    });
    await t.test(
      "product CRUD, validation, pagination and search",
      async () => {
        await request("/products", {
          method: "POST",
          token: staffToken,
          body: { name: "محصول", price: 100 },
          status: 403,
        });
        product = (
          await request("/products", {
            method: "POST",
            body: {
              name: "کالای آزمایشی",
              price: "1000",
              stock: "8",
              category: "دفتر",
            },
            status: 201,
          })
        ).data.product;
        assert.equal(product.stock, 8);
        assert.equal(product.sortBy, undefined);
        await request("/products", {
          method: "POST",
          body: { name: "x", price: -10 },
          status: 400,
        });
        const list = (
          await request(
            "/products?page=1&pageSize=1&sortBy=price&sortOrder=asc",
          )
        ).data;
        assert.equal(list.pagination.pageSize, 1);
        assert.equal(list.items.length, 1);
        assert.equal(
          (await request("/products?search=missing")).data.items.length,
          0,
        );
        await request("/products?page=-1", { status: 400 });
        await request("/products?sortBy=passwordHash", { status: 400 });
        await request(`/products/${product.id}`, {
          method: "PATCH",
          body: {},
          status: 400,
        });
        assert.equal(
          (
            await request(`/products/${product.id}`, {
              method: "PATCH",
              body: { stock: 10 },
              token: managerToken,
            })
          ).data.product.stock,
          10,
        );
      },
    );
    await t.test("user CRUD, self-protection and profile update", async () => {
      await request("/users", {
        method: "POST",
        token: managerToken,
        body: {},
        status: 403,
      });
      const user = (
        await request("/users", {
          method: "POST",
          status: 201,
          body: {
            name: "کاربر موقت",
            email: "temporary@example.test",
            password: "TempPass123",
          },
        })
      ).data.user;
      assert.equal(user.passwordHash, undefined);
      assert.equal(
        (
          await request(`/users/${user.id}`, {
            method: "PATCH",
            body: { name: "نام تازه" },
          })
        ).data.user.name,
        "نام تازه",
      );
      await request(`/users/${fixture.admin.id}`, {
        method: "PATCH",
        body: { role: "STAFF" },
        status: 403,
      });
      await request(`/users/${fixture.admin.id}`, {
        method: "DELETE",
        status: 403,
      });
      await request(`/users/${fixture.staff.id}`, {
        method: "PATCH",
        token: managerToken,
        body: { role: "ADMIN" },
        status: 403,
      });
      assert.equal(
        (
          await request("/users/me", {
            method: "PATCH",
            body: { name: "مدیر تست" },
          })
        ).data.user.name,
        "مدیر تست",
      );
      await request(`/users/${user.id}`, { method: "DELETE", status: 204 });
      await request(`/users/${user.id}`, { status: 404 });
    });
    await t.test(
      "coupon validation, update and boolean filtering",
      async () => {
        coupon = (
          await request("/coupons", {
            method: "POST",
            status: 201,
            body: { code: " qa10 ", discountValue: 10, maxUses: 1 },
          })
        ).data.coupon;
        assert.equal(coupon.code, "QA10");
        await request("/coupons", {
          method: "POST",
          body: { code: "BIG", discountValue: 101 },
          status: 400,
        });
        await request(`/coupons/${coupon.id}`, {
          method: "PATCH",
          body: { discountValue: 101 },
          status: 400,
        });
        await request(`/coupons/${coupon.id}`, {
          method: "PATCH",
          body: { isActive: false },
        });
        await request(`/coupons/${coupon.id}`, {
          method: "PATCH",
          body: { maxUses: 1 },
        });
        assert.equal(
          (await request(`/coupons/${coupon.id}`)).data.coupon.isActive,
          false,
        );
        assert.equal(
          (await request("/coupons?isActive=false")).data.items.length,
          1,
        );
        await request(`/coupons/${coupon.id}`, {
          method: "PATCH",
          body: { isActive: true },
        });
      },
    );
    await t.test(
      "order discounts, atomic inventory and cancellation",
      async () => {
        const body = {
          customerId: fixture.staff.id,
          items: [{ productId: product.id, quantity: 2 }],
          couponCode: "QA10",
        };
        order = (
          await request("/orders", { method: "POST", body, status: 201 })
        ).data.order;
        assert.equal(Number(order.totalAmount), 1800);
        assert.equal(
          (await request(`/products/${product.id}`)).data.product.stock,
          8,
        );
        await request("/orders", { method: "POST", body, status: 400 });
        await request("/orders", {
          method: "POST",
          body: {
            ...body,
            couponCode: undefined,
            items: [{ productId: product.id, quantity: 999 }],
          },
          status: 400,
        });
        await request("/orders", {
          method: "POST",
          body: { ...body, items: [...body.items, ...body.items] },
          status: 400,
        });
        await request(`/orders/${order.id}/status`, {
          method: "PATCH",
          token: staffToken,
          body: { status: "SHIPPED" },
          status: 403,
        });
        await request(`/orders/${order.id}/status`, {
          method: "PATCH",
          body: { status: "CANCELLED" },
        });
        await request(`/orders/${order.id}/status`, {
          method: "PATCH",
          body: { status: "CANCELLED" },
        });
        assert.equal(
          (await request(`/products/${product.id}`)).data.product.stock,
          10,
        );
        assert.equal(
          (await request(`/coupons/${coupon.id}`)).data.coupon.usedCount,
          0,
        );
        await request(`/orders/${order.id}/status`, {
          method: "PATCH",
          body: { status: "PENDING" },
          status: 400,
        });
        const sales = await request("/dashboard");
        assert.equal(sales.data.stats.revenue, 0);
        assert.equal(sales.data.weeklyRevenue.length, 7);
        assert.equal((await request("/orders")).data.items.length, 1);
      },
    );
    await t.test("concurrent orders never oversell the last unit", async () => {
      const limited = (
        await request("/products", {
          method: "POST",
          status: 201,
          body: { name: "آخرین موجودی", price: 100, stock: 1 },
        })
      ).data.product;
      const responses = await Promise.all(
        Array.from({ length: 2 }, () =>
          fetch(base + "/orders", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${adminToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              customerId: fixture.staff.id,
              items: [{ productId: limited.id, quantity: 1 }],
            }),
          }),
        ),
      );
      assert.equal(
        responses.filter((response) => response.status === 201).length,
        1,
      );
      assert.ok(
        responses.every((response) =>
          [201, 400, 409].includes(response.status),
        ),
      );
      assert.equal(
        (await request(`/products/${limited.id}`)).data.product.stock,
        0,
      );
    });
    await t.test("tickets, comments, search and status", async () => {
      ticket = (
        await request("/tickets", {
          method: "POST",
          body: {
            title: "پیگیری آزمایشی",
            description: "شرح مشکل آزمایشی",
            priority: "URGENT",
          },
          status: 201,
        })
      ).data.ticket;
      const comment = (
        await request(`/tickets/${ticket.id}/comments`, {
          method: "POST",
          body: { content: "پاسخ آزمایشی" },
          status: 201,
        })
      ).data.comment;
      assert.equal(comment.author.name, "مدیر تست");
      assert.equal(
        (await request(`/tickets/${ticket.id}`)).data.ticket.comments.length,
        1,
      );
      assert.equal(
        (await request("/comments?search=پاسخ")).data.items.length,
        1,
      );
      await request(`/tickets/${ticket.id}`, {
        method: "PATCH",
        body: { status: "RESOLVED" },
      });
      await request(`/tickets/${ticket.id}`, { method: "DELETE", status: 204 });
      assert.equal((await request("/comments")).data.items.length, 0);
    });
    await t.test("customer reviews, moderation and the Table Talk feed", async () => {
      // محصول فعال برای گرفتن نظر (نظر فقط روی محصول فعال ثبت می‌شود)
      const burger = (
        await request("/products", {
          method: "POST",
          status: 201,
          body: { name: "برگر آزمایشی نظرات", price: "250000", stock: 5, category: "برگر" },
        })
      ).data.product;

      // ثبت نظر از مسیر عمومی و بدون توکن (مثل وب‌سایت مهمان). شمارهٔ تماس عمداً
      // با ارقام فارسی و جداکننده فرستاده می‌شود تا نرمال‌سازی سرور بررسی شود.
      const created = await request("/public/reviews", {
        method: "POST",
        token: null,
        status: 201,
        body: {
          productId: burger.id,
          authorName: "مهمان آزمایشی",
          rating: 5,
          body: "کیفیت این برگر واقعاً خوب بود و دوباره می‌آیم.",
          authorPhone: "۰۹۱۲ ۳۴۵ ۶۷۸۹",
        },
      });
      assert.equal(created.data.review.status, "PENDING");

      // شمارهٔ تماس نامعتبر باید همان‌جا رد شود (قالب مشترک با وب‌سایت).
      await request("/public/reviews", {
        method: "POST",
        token: null,
        status: 400,
        body: {
          productId: burger.id,
          authorName: "مهمان آزمایشی",
          rating: 5,
          body: "کیفیت این برگر واقعاً خوب بود و دوباره می‌آیم.",
          authorPhone: "تلفن نیست",
        },
      });

      // نظر در انتظار تأیید نباید در فهرست عمومی دیده شود
      const beforeApproval = await request(`/public/reviews?productId=${burger.id}`, { token: null });
      assert.equal(beforeApproval.data.items.length, 0);
      assert.equal(beforeApproval.data.summary.total, 0);
      assert.deepEqual(beforeApproval.data.summary.distribution, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

      // پنل مدیریت شمارهٔ تماس نرمال‌شده را می‌بیند و با آن هم می‌تواند جستجو کند
      const pendingList = await request("/reviews?status=PENDING");
      assert.equal(pendingList.data.items[0].authorPhone, "09123456789");
      assert.equal(pendingList.data.items[0].body, "کیفیت این برگر واقعاً خوب بود و دوباره می‌آیم.");
      assert.equal(pendingList.data.items[0].productName, "برگر آزمایشی نظرات");
      assert.ok(pendingList.data.items[0].createdAt);
      assert.equal((await request("/reviews?search=0912345678")).data.pagination.total, 1);
      assert.equal(
        (await request(`/reviews?search=${encodeURIComponent("۰۹۱۲۳۴۵")}`)).data.pagination.total,
        1,
      );
      assert.equal((await request("/reviews?search=zzz-nope")).data.pagination.total, 0);

      // نظر در انتظار بررسی در آمار داشبورد (زنگ اعلان‌های TopBar) شمرده می‌شود
      const pendingStats = await request("/dashboard");
      assert.equal(pendingStats.data.stats.pendingReviews, 1);

      // اعتبارسنجی سمت سرور: امتیاز بیرون از بازه و متن کوتاه رد می‌شوند
      await request("/public/reviews", {
        method: "POST",
        token: null,
        status: 400,
        body: { productId: burger.id, authorName: "م", rating: 9, body: "کوتاه" },
      });
      // محصول ناموجود باید ۴۰۰ بدهد و نه ۴۰۴؛ چون وب‌سایت هر ۴۰۴ روی این مسیر را
      // «مسیر نظرات ساخته نشده» می‌داند و به دادهٔ آزمایشی برمی‌گردد.
      await request("/public/reviews", {
        method: "POST",
        token: null,
        status: 400,
        body: { productId: "missing-product", authorName: "مهمان", rating: 4, body: "متن کافی برای اعتبارسنجی دارد." },
      });
      // فهرست عمومی برای شناسهٔ نامعتبر خطا نمی‌دهد، فهرست خالی برمی‌گرداند
      assert.equal(
        (await request("/public/reviews?productId=missing-product", { token: null })).data.items.length,
        0,
      );

      // تأیید نظر + انتخاب برای Table Talk + ثبت ترجمهٔ انگلیسی (از پنل)
      const approved = await request(`/reviews/${created.data.review.id}`, {
        method: "PATCH",
        body: {
          status: "APPROVED",
          featured: true,
          authorNameEn: "Guest Tester",
          bodyEn: "The burger was genuinely good; I will be back.",
          // اصلاح شمارهٔ تماس از پنل هم نرمال ذخیره می‌شود.
          authorPhone: "0935 111 2233",
        },
      });
      assert.equal(approved.data.review.status, "APPROVED");
      assert.equal(approved.data.review.featured, true);
      assert.equal(approved.data.review.authorPhone, "09351112233");
      await request(`/reviews/${created.data.review.id}`, { method: "PATCH", body: {}, status: 400 });

      // فهرست عمومی محصول + خلاصهٔ امتیاز
      const afterApproval = await request(`/public/reviews?productId=${burger.id}&sort=highest`, { token: null });
      assert.equal(afterApproval.data.items.length, 1);
      assert.equal(afterApproval.data.items[0].orderVerified, false);
      // شمارهٔ تماس دادهٔ داخلی است و نباید در پاسخ عمومی لو برود.
      assert.equal("authorPhone" in afterApproval.data.items[0], false);
      assert.equal(afterApproval.data.summary.average, 5);
      assert.equal(afterApproval.data.summary.total, 1);
      assert.equal(afterApproval.data.hasMore, false);

      // فیلترها: امتیاز و «فقط نظرهای دارای تصویر»
      assert.equal((await request(`/public/reviews?productId=${burger.id}&rating=4`, { token: null })).data.items.length, 0);
      assert.equal((await request(`/public/reviews?productId=${burger.id}&withImages=1`, { token: null })).data.items.length, 0);

      // بخش Table Talk فقط نظر انتخاب‌شده را برمی‌گرداند
      const feed = await request("/public/testimonials", { token: null });
      assert.equal(feed.data.items.length, 1);
      assert.equal(feed.data.items[0].rating, 5);
      assert.equal(feed.data.items[0].bodyEn, "The burger was genuinely good; I will be back.");
      assert.equal(feed.data.items[0].authorNameEn, "Guest Tester");

      // پنل مدیریت همهٔ نظرها را با شمارهٔ سفارش و شمارهٔ تماس می‌بیند (دادهٔ داخلی)
      const adminList = await request("/reviews?status=APPROVED");
      assert.equal(adminList.data.items.length, 1);
      assert.equal(adminList.data.pagination.total, 1);
      assert.equal(adminList.data.items[0].authorPhone, "09351112233");

      // برداشتن پرچم Table Talk، فید صفحهٔ اصلی را خالی می‌کند
      await request(`/reviews/${created.data.review.id}`, { method: "PATCH", body: { featured: false } });
      assert.equal((await request("/public/testimonials", { token: null })).data.items.length, 0);

      // حذف نظر از پنل
      await request(`/reviews/${created.data.review.id}`, { method: "DELETE", status: 204 });
      await request("/reviews/unknown-review", { method: "DELETE", status: 404 });
      assert.equal((await request("/public/reviews?productId=" + burger.id, { token: null })).data.summary.total, 0);
    });

    await t.test(
      "public menu catalogue, category mapping and chat guard rails",
      async () => {
        // محصولی با دسته‌بندی فارسی، مثل داده واقعی رستوران در دیتابیس
        const burger = (
          await request("/products", {
            method: "POST",
            status: 201,
            body: {
              name: "برگر آزمایشی مخصوص",
              price: "250000",
              stock: "3",
              category: "برگر",
            },
          })
        ).data.product;

        // منوی عمومی برای مهمان باز است و بدون توکن کار می‌کند (token: null یعنی بدون هدر Authorization)
        const menu = await request("/public/menu", { token: null });
        assert.ok(Array.isArray(menu.data.items));
        assert.equal(menu.data.currency, "IRT");
        const mapped = menu.data.items.find(
          (entry) => entry.productId === burger.id,
        );
        assert.ok(mapped, "محصول ساخته‌شده از پنل باید در منوی عمومی دیده شود");
        assert.equal(mapped.category, "burgers");
        assert.equal(mapped.categoryLabel, "برگر");
        assert.equal(mapped.price, 250000);
        assert.equal(mapped.image, null);
        assert.equal(mapped.available, true);
        assert.equal(mapped.slug, "برگر-آزمایشی-مخصوص");

        const single = await request(
          `/public/menu/${encodeURIComponent(mapped.slug)}`,
          { token: null },
        );
        assert.equal(single.data.item.productId, burger.id);

        const filtered = await request(
          `/public/menu?category=${encodeURIComponent("برگر")}`,
          { token: null },
        );
        assert.ok(filtered.data.items.length >= 1);
        assert.ok(
          filtered.data.items.every((entry) => entry.categoryLabel === "برگر"),
        );

        await request("/public/menu/unknown-item-404", {
          token: null,
          status: 404,
        });
        // origin وب‌سایت (پورت ۵۱۷۴) در allowlist است
        await request("/public/menu", {
          token: null,
          origin: "http://localhost:5174",
        });
        // مسیر ادمین همان‌طور که قبلاً بود محافظت‌شده می‌ماند
        await request("/products", { token: null, status: 401 });

        // دستیار گفتگو: بدنه نامعتبر باید پیش از هر تماس با مدل زبانی رد شود
        // (تست عمداً درخواست معتبر نمی‌فرستد تا هزینه/وابستگی بیرونی نداشته باشد)
        await request("/chat", {
          method: "POST",
          token: null,
          body: {},
          status: 400,
        });
        await request("/chat", {
          method: "POST",
          token: null,
          body: { messages: [] },
          status: 400,
        });
        await request("/chat", {
          method: "POST",
          token: null,
          body: { messages: [{ role: "tool", content: "x" }] },
          status: 400,
        });
      },
    );
    await t.test(
      "chat commerce endpoints validate input and reserve live stock",
      async () => {
        const config = await request("/payment/config", { token: null });
        assert.equal(typeof config.data.zibalEnabled, "boolean");
        assert.equal(typeof config.data.cardToCard.enabled, "boolean");
        await request("/payment/orders", {
          method: "POST",
          token: null,
          body: {
            customerName: "مشتری آزمایشی",
            customerPhone: "09120000000",
            items: [],
          },
          status: 400,
        });
        const checkoutProduct = (
          await request("/products", {
            method: "POST",
            status: 201,
            body: {
              name: "محصول تست پرداخت",
              price: "250000",
              stock: "3",
              category: "تست",
            },
          })
        ).data.product;
        const checkout = await request("/payment/orders", {
          method: "POST",
          token: null,
          status: 201,
          body: {
            sessionId: "test-session-1234567890",
            customerName: "مشتری آزمایشی",
            customerPhone: "09120000000",
            shippingAddress: "بیرجند، خیابان آزمایشی، پلاک ۱۰",
            items: [{ productId: checkoutProduct.id, quantity: 1 }],
          },
        });
        assert.match(checkout.data.order.orderNumber, /^WEB-/);
        assert.equal(checkout.data.order.totalAmount, 250000);
        assert.equal(checkout.data.order.status, "RESERVED");
        await request("/payment/zibal/request", {
          method: "POST",
          token: null,
          body: {},
          status: 400,
        });
        await request(`/conversations/${"x".repeat(24)}`, {
          token: null,
          status: 404,
        });
      },
    );

    await t.test(
      "product variants reach the public menu and price the order",
      async () => {
        // محصولی با سه سایز، مثل پیتزای تک‌نفره/دو‌نفره/شش‌نفره در پنل
        const pizza = (
          await request("/products", {
            method: "POST",
            status: 201,
            body: {
              name: "پیتزا آزمایشی واریانت‌دار",
              price: "235000",
              stock: "10",
              category: "پیتزا",
              variants: [
                { label: "تک نفره", labelEn: "Single", price: "235000", sortOrder: 0 },
                { label: "دو نفره", labelEn: "Double", price: "425000", sortOrder: 1 },
                { label: "شش نفره", labelEn: "Party", price: "980000", sortOrder: 2 },
              ],
            },
          })
        ).data.product;
        assert.equal(pizza.variants.length, 3);
        assert.equal(pizza.variants[0].label, "تک نفره");
        assert.equal(Number(pizza.variants[2].price), 980000);
        const removedVariantId = pizza.variants[1].id;

        // برچسب تکراری باید پیش از رسیدن به دیتابیس رد شود
        await request("/products", {
          method: "POST",
          status: 400,
          body: {
            name: "پیتزا با سایز تکراری",
            price: "100000",
            variants: [
              { label: "دو نفره", price: "100000" },
              { label: "دو نفره", price: "200000" },
            ],
          },
        });

        // ویرایش: یک سایز حذف و قیمت سایز دیگر عوض می‌شود
        const updated = (
          await request(`/products/${pizza.id}`, {
            method: "PATCH",
            body: {
              variants: [
                { label: "تک نفره", labelEn: "Single", price: "245000", sortOrder: 0 },
                { label: "شش نفره", labelEn: "Party", price: "1010000", sortOrder: 1 },
              ],
            },
          })
        ).data.product;
        assert.deepEqual(
          updated.variants.map((variant) => variant.label),
          ["تک نفره", "شش نفره"],
        );
        assert.equal(Number(updated.variants[0].price), 245000);

        // فهرست پنل هم سایزها را برمی‌گرداند تا فرم ویرایش بتواند نشان دهد
        const listed = await request(
          `/products?search=${encodeURIComponent("پیتزا آزمایشی واریانت‌دار")}`,
        );
        assert.equal(listed.data.items[0].variants.length, 2);

        // منوی عمومی: قیمت پایه = ارزان‌ترین سایز، به‌همراه سایزهای فعال
        const menu = await request("/public/menu", { token: null });
        const publicPizza = menu.data.items.find((entry) => entry.productId === pizza.id);
        assert.ok(publicPizza, "پیتزای واریانت‌دار باید در منوی عمومی باشد");
        assert.equal(publicPizza.category, "pizza");
        assert.equal(publicPizza.price, 245000);
        assert.deepEqual(
          publicPizza.variants.map((variant) => variant.label),
          ["تک نفره", "شش نفره"],
        );
        assert.equal(publicPizza.variants[0].labelEn, "Single");
        assert.equal(publicPizza.variants[1].price, 1010000);

        const singleVariant = publicPizza.variants.find((variant) => variant.label === "تک نفره");
        const partyVariant = publicPizza.variants.find((variant) => variant.label === "شش نفره");

        // دو سایز از یک محصول در یک سفارش: دو سطر مستقل و جمع قیمت هر دو
        const order = await request("/payment/orders", {
          method: "POST",
          token: null,
          status: 201,
          body: {
            customerName: "مشتری واریانت",
            customerPhone: "09120000001",
            shippingAddress: "بیرجند، خیابان آزمایشی، پلاک ۱۲",
            items: [
              { productId: pizza.id, variantId: singleVariant.id, quantity: 1 },
              { productId: pizza.id, variantId: partyVariant.id, quantity: 2 },
            ],
          },
        });
        assert.equal(order.data.order.totalAmount, 245000 + 1010000 * 2);
        assert.equal(order.data.order.items.length, 2);
        assert.equal(
          order.data.order.items.find((item) => item.variantLabel === "شش نفره").unitPrice,
          1010000,
        );
        // موجودی به‌اندازه مجموع تعداد هر دو سطر کم می‌شود (۱ + ۲)
        assert.equal((await request(`/products/${pizza.id}`)).data.product.stock, 7);

        // سایزی که در ویرایش حذف شد دیگر قابل سفارش نیست
        await request("/payment/orders", {
          method: "POST",
          token: null,
          status: 400,
          body: {
            customerName: "مشتری واریانت",
            customerPhone: "09120000001",
            shippingAddress: "بیرجند، خیابان آزمایشی، پلاک ۱۲",
            items: [{ productId: pizza.id, variantId: removedVariantId, quantity: 1 }],
          },
        });
        // شناسه واریانت ناموجود هم رد می‌شود
        await request("/payment/orders", {
          method: "POST",
          token: null,
          status: 400,
          body: {
            customerName: "مشتری واریانت",
            customerPhone: "09120000001",
            shippingAddress: "بیرجند، خیابان آزمایشی، پلاک ۱۲",
            items: [{ productId: pizza.id, variantId: "missing-variant-id", quantity: 1 }],
          },
        });
      },
    );

    await t.test(
      "add-ons are configured per dish, served publicly and linked to the main order line",
      async () => {
        // غذا، مخلفات آن و یک محصول بی‌ربط: فقط دومی باید پیشنهاد شود.
        const main = (
          await request("/products", {
            method: "POST",
            status: 201,
            body: { name: "برگر آزمایشی مخلفات‌دار", price: "300000", stock: "10", category: "برگر" },
          })
        ).data.product;
        const drink = (
          await request("/products", {
            method: "POST",
            status: 201,
            body: { name: "نوشیدنی آزمایشی", price: "80000", stock: "20", category: "نوشیدنی" },
          })
        ).data.product;
        const unrelated = (
          await request("/products", {
            method: "POST",
            status: 201,
            body: { name: "سالاد آزمایشی", price: "120000", stock: "5", category: "ساید" },
          })
        ).data.product;

        // فرم پنل فهرست مخلفات را کامل جایگزین می‌کند و پاسخ همان انتخاب‌ها را برمی‌گرداند
        const configured = (
          await request(`/products/${main.id}`, {
            method: "PATCH",
            body: { addOnIds: [drink.id, unrelated.id] },
          })
        ).data.product;
        assert.deepEqual(
          configured.addOns.map((entry) => entry.id),
          [drink.id, unrelated.id],
        );
        // ترتیب `sortOrder` همان ترتیب ارسالی است و در فهرست پنل هم حفظ می‌شود
        const listed = await request(
          `/products?search=${encodeURIComponent("برگر آزمایشی مخلفات‌دار")}`,
        );
        assert.deepEqual(
          listed.data.items[0].addOns.map((entry) => entry.id),
          [drink.id, unrelated.id],
        );

        // اعتبارسنجی: خودمحصول، شناسه نامعتبر، شناسه ناشناخته و تکراری
        await request(`/products/${main.id}`, {
          method: "PATCH",
          status: 400,
          body: { addOnIds: [main.id] },
        });
        await request(`/products/${main.id}`, {
          method: "PATCH",
          status: 400,
          body: { addOnIds: ["not-a-cuid"] },
        });
        await request(`/products/${main.id}`, {
          method: "PATCH",
          status: 400,
          body: { addOnIds: ["cnotarealproduct000000000"] },
        });
        await request(`/products/${main.id}`, {
          method: "PATCH",
          status: 400,
          body: { addOnIds: [drink.id, drink.id] },
        });

        // ویرایش جزئی (بدون `addOnIds`) نباید پیکربندی را پاک کند
        await request(`/products/${main.id}`, { method: "PATCH", body: { stock: "9" } });
        assert.equal((await request(`/products/${main.id}`)).data.product.addOns.length, 2);

        // منوی عمومی فقط «تعداد» را می‌گوید و فهرست کامل در مسیر مخلفات است
        const menu = await request("/public/menu", { token: null });
        const publicMain = menu.data.items.find((entry) => entry.productId === main.id);
        assert.equal(publicMain.addOnCount, 2);
        assert.equal(
          menu.data.items.find((entry) => entry.productId === drink.id).addOnCount,
          0,
        );

        const addOnFeed = await request(
          `/public/menu/${encodeURIComponent(publicMain.slug)}/addons`,
          { token: null },
        );
        assert.equal(addOnFeed.data.total, 2);
        assert.deepEqual(
          addOnFeed.data.addOns.map((entry) => entry.productId),
          [drink.id, unrelated.id],
        );
        assert.equal(addOnFeed.data.addOns[0].price, 80000);
        assert.equal(addOnFeed.data.addOns[0].available, true);
        assert.equal(addOnFeed.data.addOns[0].slug, "نوشیدنی-آزمایشی");
        // شناسه ناشناخته در مسیر مخلفات ۴۰۴ می‌شود
        await request("/public/menu/unknown-item-404/addons", { token: null, status: 404 });

        const orderBody = (items) => ({
          customerName: "مشتری مخلفات",
          customerPhone: "09120000002",
          shippingAddress: "بیرجند، خیابان آزمایشی، پلاک ۱۳",
          items,
        });

        // محصولی که برای این غذا تعریف نشده، حتی با فیلد `parent` رد می‌شود
        const unconfigured = (
          await request("/products", {
            method: "POST",
            status: 201,
            body: { name: "محصول بی‌پیکربندی", price: "50000", stock: "4" },
          })
        ).data.product;
        await request("/payment/orders", {
          method: "POST",
          token: null,
          status: 400,
          body: orderBody([
            { productId: main.id, quantity: 1 },
            { productId: unconfigured.id, quantity: 1, parent: { productId: main.id } },
          ]),
        });
        // قلم اصلی ناموجود در همان درخواست
        await request("/payment/orders", {
          method: "POST",
          token: null,
          status: 400,
          body: orderBody([
            { productId: main.id, quantity: 1 },
            { productId: drink.id, quantity: 1, parent: { productId: unconfigured.id } },
          ]),
        });
        // مخلفات نمی‌تواند قلم اصلی خودش باشد
        await request("/payment/orders", {
          method: "POST",
          token: null,
          status: 400,
          body: orderBody([{ productId: main.id, quantity: 1, parent: { productId: main.id } }]),
        });
        // سقف تعداد مخلفات سمت سرور
        await request("/payment/orders", {
          method: "POST",
          token: null,
          status: 400,
          body: orderBody([
            { productId: main.id, quantity: 1 },
            { productId: drink.id, quantity: 11, parent: { productId: main.id } },
          ]),
        });
        // یک مخلفات برای یک قلم اصلی فقط یک‌بار
        await request("/payment/orders", {
          method: "POST",
          token: null,
          status: 400,
          body: orderBody([
            { productId: main.id, quantity: 1 },
            { productId: drink.id, quantity: 1, parent: { productId: main.id } },
            { productId: drink.id, quantity: 1, parent: { productId: main.id } },
          ]),
        });

        // سفارش معتبر: مبلغ جمع هر دو قلم و پیوند مخلفات به قلم اصلی
        const order = await request("/payment/orders", {
          method: "POST",
          token: null,
          status: 201,
          body: orderBody([
            { productId: main.id, quantity: 2 },
            { productId: drink.id, quantity: 3, parent: { productId: main.id } },
          ]),
        });
        assert.equal(order.data.order.totalAmount, 300000 * 2 + 80000 * 3);
        const mainLine = order.data.order.items.find((item) => item.name === main.name);
        const addOnLine = order.data.order.items.find((item) => item.name === drink.name);
        assert.equal(mainLine.parentKey, null);
        assert.equal(mainLine.unitPrice, 300000);
        assert.equal(addOnLine.unitPrice, 80000);
        assert.equal(addOnLine.parentKey, `${main.id}::`);

        // پیوند در دیتابیس ذخیره شده و موجودی هر دو محصول کسر شده است
        const stored = await prisma.chatOrderItem.findMany({
          where: { orderId: order.data.order.id },
          select: { id: true, productId: true, parentItemId: true },
        });
        const storedMain = stored.find((item) => item.productId === main.id);
        const storedAddOn = stored.find((item) => item.productId === drink.id);
        assert.equal(storedMain.parentItemId, null);
        assert.equal(storedAddOn.parentItemId, storedMain.id);
        assert.equal((await request(`/products/${main.id}`)).data.product.stock, 9 - 2);
        assert.equal((await request(`/products/${drink.id}`)).data.product.stock, 20 - 3);

        // همان محصول می‌تواند هم مستقل و هم مخلفات یک غذا در یک سفارش باشد
        const both = await request("/payment/orders", {
          method: "POST",
          token: null,
          status: 201,
          body: orderBody([
            { productId: main.id, quantity: 1 },
            { productId: drink.id, quantity: 1 },
            { productId: drink.id, quantity: 1, parent: { productId: main.id } },
          ]),
        });
        assert.equal(both.data.order.items.length, 3);
        assert.equal(both.data.order.totalAmount, 300000 + 80000 * 2);

        // پاک‌کردن پیکربندی: پیشنهادها از منو و سفارش حذف می‌شوند
        const cleared = (
          await request(`/products/${main.id}`, { method: "PATCH", body: { addOnIds: [] } })
        ).data.product;
        assert.deepEqual(cleared.addOns, []);
        const afterClear = await request("/public/menu", { token: null });
        assert.equal(
          afterClear.data.items.find((entry) => entry.productId === main.id).addOnCount,
          0,
        );
        await request("/payment/orders", {
          method: "POST",
          token: null,
          status: 400,
          body: orderBody([
            { productId: main.id, quantity: 1 },
            { productId: drink.id, quantity: 1, parent: { productId: main.id } },
          ]),
        });
      },
    );

    await t.test(
      "refresh rotates uniquely, rejects replay and logout clears cookie",
      async () => {
        const refreshed = await request("/auth/refresh", {
          method: "POST",
          refreshCookie: cookie,
        });
        const newCookie = refreshed.response.headers
          .getSetCookie()[0]
          .split(";")[0];
        assert.notEqual(newCookie, cookie);
        await request("/auth/refresh", {
          method: "POST",
          refreshCookie: cookie,
          status: 401,
        });
        const loggedOut = await request("/auth/logout", {
          method: "POST",
          refreshCookie: newCookie,
          status: 204,
        });
        assert.ok(
          loggedOut.response.headers.get("set-cookie").includes("Expires="),
        );
        await request("/auth/refresh", {
          method: "POST",
          refreshCookie: newCookie,
          status: 401,
        });
      },
    );
    await t.test(
      "password change invalidates access and refresh sessions",
      async () => {
        await request("/users/me/password", {
          method: "PATCH",
          body: { currentPassword: "wrong", newPassword: "ChangedPass123" },
          status: 401,
        });
        await request("/users/me/password", {
          method: "PATCH",
          body: {
            currentPassword: fixture.password,
            newPassword: "ChangedPass123",
          },
          status: 204,
        });
        await request("/auth/me", { status: 401 });
        await request("/auth/login", {
          method: "POST",
          body: { email: fixture.admin.email, password: fixture.password },
          status: 401,
        });
        await request("/auth/login", {
          method: "POST",
          body: { email: fixture.admin.email, password: "ChangedPass123" },
        });
      },
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
    await fixture.cleanup();
  }
});
