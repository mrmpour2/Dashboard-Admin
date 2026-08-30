function Logo() {
  return (
    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm shadow-inner">
      <span className="text-xl font-bold font-Outfit text-white">N</span>
      <span className="absolute -bottom-1 -left-1 size-3 rounded-full bg-secondary shadow-Glow animate-pulse-glow" />
    </div>
  );
}

export default Logo;
