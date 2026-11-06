# 06.11.2026: Gewerk „Rohbau“ in der Vorschlagsliste (#308)

**Was:** `COMPANY_TYPES` in `features/companySettings/companyValidation.ts` enthält `Rohbau`, alphabetisch zwischen Metallbau und Sanitär. Onboarding und die Betriebskarte lesen dieselbe Liste über `TradeCombobox`. Der Wert, der nach `companies.type` geht, ist der String `Rohbau`.

**Warum so:** `companies.type` ist Freitext. In Production stehen Betriebe bereits auf `Rohbau`, die Combobox kannte den Eintrag nur nicht. Schema, Migration und Übersetzung je Gewerk bleiben unangetastet. Die App führt dieselbe Konstante in `app/lib/utils/validationUtils.ts` ([bautakt-app#230](https://github.com/BuenyA/bautakt-app/issues/230)); der Kommentar an der Liste verweist dorthin.
