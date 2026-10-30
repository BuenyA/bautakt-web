import { makeStyles, mergeClasses, Text, tokens } from '@fluentui/react-components';
import { BuildingRegular, PeopleTeamRegular } from '@fluentui/react-icons';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export type OnboardingRole = 'owner' | 'employee';

const useStyles = makeStyles({
  option: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    width: '100%',
    padding: `${tokens.spacingVerticalL} ${tokens.spacingHorizontalL}`,
    textAlign: 'start',
    cursor: 'pointer',
    color: tokens.colorNeutralForeground1,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `${tokens.strokeWidthThick} solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusLarge,
    ':hover': { backgroundColor: tokens.colorNeutralBackground1Hover },
    ':focus-visible': {
      outline: `${tokens.strokeWidthThick} solid ${tokens.colorStrokeFocus2}`,
      outlineOffset: '2px',
    },
  },
  selected: {
    border: `${tokens.strokeWidthThick} solid ${tokens.colorBrandStroke1}`,
    backgroundColor: tokens.colorBrandBackground2,
    ':hover': { backgroundColor: tokens.colorBrandBackground2Hover },
  },
  icon: {
    display: 'flex',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: '52px',
    height: '52px',
    fontSize: '28px',
    borderRadius: tokens.borderRadiusLarge,
    color: tokens.colorNeutralForeground2,
    backgroundColor: tokens.colorNeutralBackground3,
  },
  iconSelected: {
    color: tokens.colorNeutralForegroundOnBrand,
    backgroundColor: tokens.colorBrandBackground,
  },
});

/**
 * Weiche Chef / Mitarbeiter wie `role.tsx` der App. Die Wahl steuert nur den
 * weiteren Weg; die echte Rolle entsteht ueber `employments`.
 */
export function RoleChoice({
  value,
  onChange,
}: {
  value: OnboardingRole | null;
  onChange: (role: OnboardingRole) => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      role="radiogroup"
      aria-label={t('auth:setup.choice.title')}
      className="flex flex-col gap-3"
    >
      <Option
        selected={value === 'owner'}
        icon={<BuildingRegular />}
        title={t('auth:setup.choice.owner.title')}
        onSelect={() => onChange('owner')}
      />
      <Option
        selected={value === 'employee'}
        icon={<PeopleTeamRegular />}
        title={t('auth:setup.choice.employee.title')}
        onSelect={() => onChange('employee')}
      />
    </div>
  );
}

function Option({
  selected,
  icon,
  title,
  onSelect,
}: {
  selected: boolean;
  icon: ReactNode;
  title: string;
  onSelect: () => void;
}) {
  const styles = useStyles();
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={mergeClasses(styles.option, selected && styles.selected)}
      onClick={onSelect}
    >
      <span className={mergeClasses(styles.icon, selected && styles.iconSelected)}>{icon}</span>
      <Text size={500} weight="semibold">
        {title}
      </Text>
    </button>
  );
}
