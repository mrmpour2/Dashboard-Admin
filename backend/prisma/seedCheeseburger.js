import { prisma } from "../src/config/prisma.js";

const product = {
  name: "چیز برگر",
  description: "شیش برگر دستساز الین -پنیز پیتزا و سس مخصوص الین ، کاهو  و گوجه و ....",
  ingredients: "شیش برگر دستساز الین -پنیز پیتزا و سس مخصوص الین ، کاهو  و گوجه و ....",
  allergenInfo: "گلوتن، لبنیات، کنجد؛ سایر موارد: نیاز به مقدار واقعی",
  purchaseConditions: "حداقل سفارش: ۱ عدد؛ زمان آماده‌سازی: حدود ۲۰ دقیقه؛ موجودی: نیاز به مقدار واقعی",
  price: 580000,
  stock: 0,
  category: "برگر",
  imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS3Ljxcf3-OrdjIn8KINylw8wsOJ9YWBwJWHrlWCrv1qg&s=10",
  isActive: true,
};

const existing = await prisma.product.findFirst({ where: { name: product.name } });
const saved = existing
  ? await prisma.product.update({ where: { id: existing.id }, data: product })
  : await prisma.product.create({ data: product });

console.log(JSON.stringify({ id: saved.id, name: saved.name, price: Number(saved.price), stock: saved.stock }));
await prisma.$disconnect();
