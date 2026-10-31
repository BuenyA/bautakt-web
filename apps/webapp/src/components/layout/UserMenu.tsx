import { toast } from '@bautakt/ui';
import {
  Button,
  makeStyles,
  Menu,
  MenuDivider,
  MenuGroup,
  MenuGroupHeader,
  MenuItem,
  MenuItemLink,
  MenuItemRadio,
  MenuList,
  MenuPopover,
  MenuTrigger,
  mergeClasses,
  Persona,
  tokens,
} from '@fluentui/react-components';
import {
  Add20Regular,
  Building20Regular,
  BuildingMultiple20Regular,
  type FluentIcon,
  Person20Regular,
  PersonAdd20Regular,
  Settings20Regular,
  SignOut20Regular,
} from '@fluentui/react-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { useRouterLink } from '@/components/common/useRouterLink';
import { useAuth } from '@/features/auth/useAuth';
import { useMyProfile } from '@/features/auth/useMyProfile';
import { JoinCompanyDialog } from '@/features/company/JoinCompanyDialog';
import { useMembership } from '@/features/company/useMembership';
import { useMyCompanies, useSwitchCompany } from '@/features/company/useMyCompanies';
import { anyCompanySection, useCompanyAccess } from '@/features/companySettings/companyAccess';
import { useProfileImageUrls } from '@/features/team/useProfileImageUrls';
import { readableDbError } from '@/lib/dbErrors';
import { additionalCompanyParam, HOME_ROUTE, routes } from '@/lib/routes';

import { useSidebarStyles } from './sidebarStyles';

const useStyles = makeStyles({
  // Ein Knopf für beide Zustände. Avatar 32 px, 5 px Einzug plus 1 px Rand:
  // Mitte auf der Mittellinie der Icon-Leiste.
  personaButton: {
    width: '100%',
    minWidth: 0,
    maxWidth: 'none',
    justifyContent: 'flex-start',
    paddingBlock: tokens.spacingVerticalS,
    paddingInlineStart: '5px',
    paddingInlineEnd: tokens.spacingHorizontalS,
    minHeight: '48px',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  },
  popover: {
    minWidth: '260px',
  },
  header: {
    paddingBlock: tokens.spacingVerticalS,
    paddingInline: tokens.spacingHorizontalS,
  },
});

/** Ein Eintrag, der clientseitig navigiert und danach die mobile Leiste schließt. */
function MenuLink({
  to,
  icon: Icon,
  label,
  onNavigate,
}: {
  to: string;
  icon: FluentIcon;
  label: string;
  onNavigate?: () => void;
}) {
  const link = useRouterLink(to);
  return (
    <MenuItemLink
      icon={<Icon />}
      href={link.href}
      onClick={(event) => {
        link.onClick(event);
        onNavigate?.();
      }}
    >
      {label}
    </MenuItemLink>
  );
}

/**
 * Untermenü unter dem Firmennamen: Betrieb wechseln, beitreten, anlegen.
 * Der Wechsel setzt `is_primary` (`switch_primary_company`) und lädt danach
 * alles neu; jeder Cache-Schlüssel trägt den Mandanten.
 */
function CompanySwitcher({
  companyName,
  onNavigate,
  onJoin,
}: {
  companyName: string;
  onNavigate?: () => void;
  onJoin: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const companies = useMyCompanies();
  const switchCompany = useSwitchCompany();
  const { data: membership } = useMembership();
  const current = membership?.companyId ?? '';

  async function select(companyId: string) {
    if (companyId === current || switchCompany.isPending) return;
    try {
      await switchCompany.mutateAsync(companyId);
      onNavigate?.();
      void navigate(HOME_ROUTE);
    } catch (caught) {
      toast.error(t('account:switch.error'), {
        description: readableDbError(caught) ?? undefined,
      });
    }
  }

  return (
    <Menu
      checkedValues={{ company: [current] }}
      onCheckedValueChange={(_, data) => {
        if (data.name === 'company' && data.checkedItems[0]) void select(data.checkedItems[0]);
      }}
    >
      <MenuTrigger disableButtonEnhancement>
        <MenuItem icon={<Building20Regular />} secondaryContent={t('account:switch.short')}>
          <span className="block max-w-44 truncate">{companyName}</span>
        </MenuItem>
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          <MenuGroup>
            <MenuGroupHeader>{t('account:switch.title')}</MenuGroupHeader>
            {(companies.data ?? []).map((company) => (
              <MenuItemRadio
                key={company.companyId}
                name="company"
                value={company.companyId}
                secondaryContent={company.role}
              >
                {company.name || t('account:switch.unnamed')}
              </MenuItemRadio>
            ))}
          </MenuGroup>
          <MenuDivider />
          <MenuItem icon={<PersonAdd20Regular />} onClick={onJoin}>
            {t('account:switch.join')}
          </MenuItem>
          <MenuLink
            to={`${routes.companySetup}?${additionalCompanyParam}=1`}
            icon={Add20Regular}
            label={t('account:switch.create')}
            onNavigate={onNavigate}
          />
        </MenuList>
      </MenuPopover>
    </Menu>
  );
}

/**
 * Menü unten links (Fluent-`Persona` als Auslöser).
 *
 * Reihenfolge nach Owner-Vorgabe (2026-10-30): oben der Betrieb mit dem
 * Wechsel, dann Mein Profil, Unternehmen, Einstellungen — Einstellungen ganz
 * unten —, abgesetzt das Abmelden. Darstellung und Rechtliches stehen nicht
 * mehr hier, sondern in Einstellungen bzw. Mein Profil.
 */
export function UserMenu({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  const styles = useStyles();
  const sidebar = useSidebarStyles();
  const { signOut, user } = useAuth();
  const { data: membership } = useMembership();
  const access = useCompanyAccess();
  const [joinOpen, setJoinOpen] = useState(false);

  const { data: profile } = useMyProfile();
  const imagePath = profile?.imagePath ?? null;
  const imageUrl = useProfileImageUrls([imagePath]).data?.[imagePath ?? ''];

  const email = user?.email ?? '';
  const company = membership?.companyName ?? '';
  // Mit Namen bildet Fluent die Initialen selbst („Bünyamin Aydemir“ → BA);
  // ohne Namen die ersten zwei Buchstaben der E-Mail.
  const avatar = {
    name: profile?.name || undefined,
    initials: profile?.name ? undefined : email.slice(0, 2).toUpperCase() || '??',
    image: imageUrl ? { src: imageUrl } : undefined,
    color: 'brand' as const,
  };

  const labelClass = mergeClasses(sidebar.label, collapsed && sidebar.labelHidden);
  const trigger = (
    <Button
      appearance="subtle"
      className={styles.personaButton}
      aria-label={collapsed ? email : undefined}
    >
      <Persona
        primaryText={{ children: company || email, className: labelClass }}
        secondaryText={company ? { children: email, className: labelClass } : undefined}
        avatar={avatar}
        size="medium"
        textAlignment="center"
        className="min-w-0 text-left"
      />
    </Button>
  );

  return (
    <>
      <Menu positioning="above-start">
        <MenuTrigger disableButtonEnhancement>{trigger}</MenuTrigger>
        <MenuPopover className={styles.popover}>
          <div className={styles.header}>
            <Persona
              primaryText={profile?.name || email}
              secondaryText={profile?.name ? email : undefined}
              avatar={avatar}
              size="large"
            />
          </div>
          <MenuList>
            {company ? (
              <CompanySwitcher
                companyName={company}
                onNavigate={onNavigate}
                onJoin={() => setJoinOpen(true)}
              />
            ) : null}
            <MenuDivider />
            <MenuLink
              to={routes.profile}
              icon={Person20Regular}
              label={t('account:menu.profile')}
              onNavigate={onNavigate}
            />
            {anyCompanySection(access) ? (
              <MenuLink
                to={routes.company}
                icon={BuildingMultiple20Regular}
                label={t('account:menu.company')}
                onNavigate={onNavigate}
              />
            ) : null}
            <MenuLink
              to={routes.settings}
              icon={Settings20Regular}
              label={t('account:menu.settings')}
              onNavigate={onNavigate}
            />
            <MenuDivider />
            <MenuItem icon={<SignOut20Regular />} onClick={() => void signOut()}>
              {t('common:action.signOut')}
            </MenuItem>
          </MenuList>
        </MenuPopover>
      </Menu>
      <JoinCompanyDialog open={joinOpen} onOpenChange={setJoinOpen} />
    </>
  );
}
