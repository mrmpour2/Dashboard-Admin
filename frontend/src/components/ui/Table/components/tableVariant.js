export const tableVariants = {
  default: "w-full border-collapse text-sm",

  bordered:
    "w-full border-collapse text-sm [&_td]:border [&_td]:border-Border [&_th]:border [&_th]:border-Border",

  striped:
    "w-full border-collapse text-sm [&_tbody_tr:nth-child(even)]:bg-SurfaceMuted/30",

  // گزینه پیشنهادی: با جداکننده‌های ظریف
  modern:
    "w-full border-collapse text-sm [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-SurfaceMuted/40",
};
