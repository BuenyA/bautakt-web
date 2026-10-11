import {
  Avatar,
  AvatarGroup,
  AvatarGroupItem,
  AvatarGroupPopover,
  type AvatarSize,
  partitionAvatarGroupItems,
} from '@fluentui/react-components';

import type { CrewMember } from '../useTodayData';

/**
 * Wer bei einem Einsatz dabei ist: überlappende Profilbilder wie in der
 * Handy-App (`EmployeeAvatarStack`), höchstens vier, der Rest hinter „+N“.
 * Ohne Bild zeigt Fluent die Initialen.
 */
export function CrewAvatars({
  crew,
  urls,
  size = 24,
}: {
  crew: readonly CrewMember[];
  urls: Record<string, string>;
  size?: AvatarSize;
}) {
  const { inlineItems, overflowItems } = partitionAvatarGroupItems({
    items: crew,
    maxInlineItems: 4,
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
