import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    sourcemap: false,
    // تفکیک وابستگی‌های حجیم به chunk جدا برای بارگذاری سریع‌تر و کش بهتر مرورگر
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("recharts")) return "charts";
            if (id.includes("@tanstack")) return "query";
            if (id.includes("react-router") || id.includes("/react/") || id.includes("/react-dom/"))
              return "vendor";
          }
        },
      },
    },
  },
  server: {
    // تنظیم proxy برای جلوگیری از مشکلات CORS در توسعه (بک‌اند Express روی پورت ۵۰۰۰)
    proxy: {
      "/api": {
        target: process.env.VITE_DEV_API_TARGET || "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
