// دور زدن handlerهای async بدون نیاز به try/catch تکراری در هر route.
// هر خطای رد‌شده (rejected) خودکار به centralized error handler هدایت می‌شود.
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
