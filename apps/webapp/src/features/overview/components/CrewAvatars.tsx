import {
  Avatar,
  AvatarGroup,
  AvatarGroupItem,
  AvatarGroupPopover,
  type AvatarSize,
  partitionAvatarGroupItems,
} from '@fluentui/react-components';

import type { CrewMember } from '@/features/assignments/crew';

/**
 * Wer bei einem Einsatz dabei ist: überlappende Profilbilder wie in der
 * Handy-App (`EmployeeAvatarStack`), standardmäßig höchstens vier, der Rest
 * hinter „+N“.
 * Ohne Bild zeigt Fluent die Initialen.
 */
export function CrewAvatars({
  crew,
  urls,
  size = 24,
  maxInline = 4,
}: {
  crew: readonly CrewMember[];
  urls: Record<string, string>;
  size?: AvatarSize;
  /** Wie viele Gesichter vor „+N“ stehen; in schmalen Spalten weniger. */
  maxInline?: number;
}) {
  const { inlineItems, overflowItems } = partitionAvatarGroupItems({
    items: crew,
    maxInlineItems: maxInline,
  });
  const image = (member: CrewMember) =>
    member.imagePath && urls[member.imagePath] ? { src: urls[member.imagePath] } : undefined;

  return (
    <AvatarGroup layout="stack" size={size}>
      {inlineItems.map((member) => (
        <AvatarGroupItem
          key={member.employmentId}
          name={member.name}
          image={image(member)}
          color="colorful"
        />
      ))}
      {overflowItems ? (
        <AvatarGroupPopover>
          {overflowItems.map((member) => (
            <AvatarGroupItem
              key={member.employmentId}
              name={member.name}
              image={image(member)}
              color="colorful"
            />
          ))}
        </AvatarGroupPopover>
      ) : null}
    </AvatarGroup>
  );
}

/** Ein einzelnes Profilbild, etwa in der Abwesenheitsleiste. */
export function MemberAvatar({
  member,
  urls,
  size = 24,
}: {
  member: CrewMember;
  urls: Record<string, string>;
  size?: AvatarSize;
}) {
  return (
    <Avatar
      name={member.name}
      size={size}
      color="colorful"
      image={
        member.imagePath && urls[member.imagePath] ? { src: urls[member.imagePath] } : undefined
      }
    />
  );
}

/**
 * Gesichter als reine Anzeige, ohne Popover-Knopf für „+N“. Für Stellen, die
 * selbst ein Link sind (Block im Wochenplan) — ein Knopf im Link wäre doppelt
 * klickbar und ungültiges HTML. Die Namen trägt der Link im Label.
 */
export function CrewFaces({
  crew,
  urls,
  size = 20,
  maxInline = 4,
}: {
  crew: readonly CrewMember[];
  urls: Record<string, string>;
  size?: AvatarSize;
  maxInline?: number;
}) {
  const shown = crew.length > maxInline ? crew.slice(0, maxInline - 1) : crew;
  const hidden = crew.length - shown.length;
  return (
    <span className="flex min-w-0 items-center gap-1" aria-hidden>
      <AvatarGroup layout="stack" size={size}>
        {shown.map((member) => (
          <AvatarGroupItem
            key={member.employmentId}
            name={member.name}
            image={
              member.imagePath && urls[member.imagePath]
                ? { src: urls[member.imagePath] }
                : undefined
            }
            color="colorful"
          />
        ))}
      </AvatarGroup>
      {hidden > 0 ? <span className="text-muted-foreground text-[11px]">+{hidden}</span> : null}
    </span>
  );
}
