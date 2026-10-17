/** IRIS.ai brand mark — terracotta tile with serif monogram. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-accent to-accent-hover font-serif font-bold text-white shadow-sm"
      style={{ width: size, height: size, fontSize: size * 0.44 }}
      aria-hidden
    >
      IR
    </div>
  );
}

/** Small assistant avatar shown next to every model reply. */
export function AssistantAvatar() {
  return (
    <div
      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-hover font-serif text-[12px] font-bold text-white"
      aria-hidden
    >
      IR
    </div>
  );
}
