import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        process: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        // سرور Node است و از APIهای وب (fetch/AbortSignal) هم استفاده می‌کند؛
        // بدون این‌ها `no-undef` روی کد موجود خطای الکی می‌داد.
        Buffer: "readonly",
        fetch: "readonly",
        AbortSignal: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
];
