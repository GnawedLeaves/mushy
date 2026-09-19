// Shared avatar display: the real image if one's been uploaded, otherwise
// the same initial-letter circle used everywhere before avatars existed.
export function ProfileAvatar({
  avatarUrl,
  label,
  className = "h-14 w-14 text-lg",
}: {
  avatarUrl: string | null;
  label: string;
  className?: string;
}) {
  const initial = label.slice(0, 1).toUpperCase();

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={label}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground ${className}`}
    >
      {initial}
    </div>
  );
}
