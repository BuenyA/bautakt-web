import { SkeletonBlock, toast } from '@bautakt/ui';
import {
  Avatar,
  Button,
  Field,
  Input,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Spinner,
} from '@fluentui/react-components';
import { Camera20Regular, Delete20Regular, ImageAdd20Regular } from '@fluentui/react-icons';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { DatePicker } from '@/components/form/dateTime';
import { SubPage } from '@/components/layout/SubNavLayout';
import { useAuth } from '@/features/auth/useAuth';
import { birthDateIssue } from '@/features/company/birthDate';
import { useCardForm } from '@/features/companySettings/companyForm';
import { FormCard } from '@/features/companySettings/FormCard';
import { SectionCard } from '@/features/contacts/SectionCard';
import { useProfileImageUrls } from '@/features/team/useProfileImageUrls';
import { readableDbError } from '@/lib/dbErrors';
import { ImageResizeError } from '@/lib/imageResize';

import {
  type ProfileDetails,
  useProfileDetails,
  useProfileImage,
  useUpdateProfile,
} from '../useProfile';

function PhotoCard({ profile }: { profile: ProfileDetails }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const image = useProfileImage();
  const url = useProfileImageUrls([profile.imagePath]).data?.[profile.imagePath ?? ''];
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ');

  async function change(file: File | null) {
    try {
      await image.mutateAsync({ file, previous: profile.imagePath });
      toast.success(t(file ? 'account:personal.photoSaved' : 'account:personal.photoRemoved'));
    } catch (caught) {
      const description =
        caught instanceof ImageResizeError
          ? t(`companySettings:template.logoErrors.${caught.code}`)
          : (readableDbError(caught) ?? undefined);
      toast.error(t('account:personal.photoError'), { description });
    }
  }

  return (
    <SectionCard title={t('account:personal.photo')} description={t('account:personal.photoHint')}>
      <div className="flex flex-wrap items-center gap-5">
        <Avatar
          size={96}
          name={name || undefined}
          initials={name ? undefined : (user?.email ?? '').slice(0, 2).toUpperCase()}
          image={url ? { src: url } : undefined}
          color="brand"
          badge={image.isPending ? { icon: <Spinner size="extra-tiny" /> } : undefined}
        />
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            event.target.value = '';
            if (file) void change(file);
          }}
        />
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <Button icon={<Camera20Regular />} disabled={image.isPending}>
              {t('account:personal.changePhoto')}
            </Button>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem icon={<ImageAdd20Regular />} onClick={() => input.current?.click()}>
                {t(
                  profile.imagePath
                    ? 'account:personal.replacePhoto'
                    : 'account:personal.uploadPhoto',
                )}
              </MenuItem>
              {profile.imagePath ? (
                <MenuItem icon={<Delete20Regular />} onClick={() => void change(null)}>
                  {t('account:personal.removePhoto')}
                </MenuItem>
              ) : null}
            </MenuList>
          </MenuPopover>
        </Menu>
      </div>
    </SectionCard>
  );
}

function NameCard({ profile }: { profile: ProfileDetails }) {
  const { t } = useTranslation();
  const update = useUpdateProfile();
  const form = useCardForm(
    { firstName: profile.firstName, lastName: profile.lastName, birthday: profile.birthday },
    (v) => {
      const issue = v.birthday ? birthDateIssue(v.birthday) : null;
      return {
        firstName:
          v.firstName.trim().length < 2 ? t('account:personal.errors.firstName') : undefined,
        lastName: v.lastName.trim().length < 2 ? t('account:personal.errors.lastName') : undefined,
        birthday:
          issue === 'future'
            ? t('auth:setup.errors.birthdayFuture')
            : issue === 'age'
              ? t('auth:setup.errors.birthdayAge')
              : issue
                ? t('auth:setup.errors.birthday')
                : undefined,
      };
    },
  );
  const v = form.values;

  return (
    <FormCard
      title={t('account:personal.name')}
      description={t('account:personal.nameHint')}
      canEdit
      dirty={form.dirty}
      saving={update.isPending}
      onReset={form.reset}
      onSave={() => {
        form.submit();
        if (form.hasErrors) return;
        update.mutate(
          {
            first_name: v.firstName.trim(),
            last_name: v.lastName.trim(),
            birthday: v.birthday || null,
          },
          {
            onSuccess: () => toast.success(t('domain:settings.saved')),
            onError: (caught) =>
              toast.error(t('domain:settings.saveError'), {
                description: readableDbError(caught) ?? undefined,
              }),
          },
        );
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label={t('account:personal.firstName')}
          required
          validationMessage={form.errorFor('firstName')}
        >
          <Input
            value={v.firstName}
            autoComplete="given-name"
            onChange={(_, d) => form.set({ firstName: d.value })}
          />
        </Field>
        <Field
          label={t('account:personal.lastName')}
          required
          validationMessage={form.errorFor('lastName')}
        >
          <Input
            value={v.lastName}
            autoComplete="family-name"
            onChange={(_, d) => form.set({ lastName: d.value })}
          />
        </Field>
        <Field
          label={t('account:personal.birthday')}
          hint={t('account:personal.birthdayHint')}
          validationMessage={form.errorFor('birthday')}
          validationState={form.errorFor('birthday') ? 'error' : 'none'}
        >
          <DatePicker
            aria-label={t('account:personal.birthday')}
            value={v.birthday}
            onChange={(value) => form.set({ birthday: value })}
          />
        </Field>
      </div>
    </FormCard>
  );
}

/** Persönliche Daten: Profilbild, Name und Geburtsdatum — wie „Profil bearbeiten“ der App. */
export function PersonalDataPage() {
  const { t } = useTranslation();
  const profile = useProfileDetails();

  return (
    <SubPage title={t('account:personal.title')} description={t('account:personal.description')}>
      {profile.data ? (
        <>
          <PhotoCard profile={profile.data} />
          <NameCard
            key={JSON.stringify([
              profile.data.firstName,
              profile.data.lastName,
              profile.data.birthday,
            ])}
            profile={profile.data}
          />
        </>
      ) : (
        <SkeletonBlock className="h-72 w-full" />
      )}
    </SubPage>
  );
}
