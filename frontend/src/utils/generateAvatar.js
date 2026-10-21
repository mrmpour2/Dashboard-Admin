// مجموعه رنگ‌های هماهنگ با پالت Nebula برای آواتارهای تولیدی
export const AVATAR_COLORS = [
  { name: "بنفش", value: "#5B3FE8" },
  { name: "فیروزه‌ای", value: "#14B8A6" },
  { name: "صورتی", value: "#EC4899" },
  { name: "نارنجی", value: "#F97316" },
  { name: "آبی", value: "#3B82F6" },
  { name: "سبز", value: "#22C55E" },
  { name: "زرد", value: "#F59E0B" },
  { name: "قرمز", value: "#EF4444" },
];

function getInitials(name = "") {
  return name.trim().slice(0, 2) || "؟";
}

// یک آواتار SVG رنگی شامل حروف اول نام می‌سازد و آن را به‌صورت data URI برمی‌گرداند.
// چون تولید کاملاً محلی (بدون درخواست شبکه) است، هم سریع است و هم به هیچ سرویس بیرونی وابسته نیست.
export function generateAvatarDataUri(name, color) {
  const initials = getInitials(name).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const safeColor = /^#[0-9a-f]{6}$/i.test(color || "") ? color : "#2455C7";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
    <rect width="128" height="128" rx="64" fill="${safeColor}" />
    <text x="50%" y="52%" font-family="Outfit, Arial, sans-serif" font-size="48" font-weight="700"
      fill="white" text-anchor="middle" dominant-baseline="middle">${initials}</text>
  </svg>`;

  // encodeURIComponent برای پشتیبانی صحیح از کاراکترهای فارسی در data URI ضروری است
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
