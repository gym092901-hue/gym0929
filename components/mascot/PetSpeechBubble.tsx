type PetSpeechBubbleProps = {
  children: string;
  className?: string;
};

export function PetSpeechBubble({
  children,
  className = "",
}: PetSpeechBubbleProps) {
  return (
    <div
      className={`relative rounded-[1.25rem] border border-berry/10 bg-white/90 px-4 py-3 text-sm font-black leading-6 text-ink shadow-soft ${className}`}
    >
      {children}
      <span
        aria-hidden
        className="absolute -bottom-2 left-8 h-4 w-4 rotate-45 border-b border-r border-berry/10 bg-white/90"
      />
    </div>
  );
}
