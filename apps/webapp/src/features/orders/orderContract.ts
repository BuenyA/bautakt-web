/**
 * Herkunft der Auftragssumme (bautakt-app#188): aus angenommenen Angeboten, von
 * Hand mit Nachträgen, nur von Hand oder keine.
 */
export type OrderContractSource = 'quotes' | 'manual_with_addenda' | 'manual' | 'none';

export type OrderContract = {
  contractNet: number | null;
  source: OrderContractSource;
  sumLocked: boolean;
  billingModeLocked: boolean;
  addendumCount: number;
};

const SOURCES: readonly OrderContractSource[] = ['quotes', 'manual_with_addenda', 'manual', 'none'];

export function toOrderContract(row: {
  contract_net: number | string | null;
  source: string | null;
  sum_locked: boolean | null;
  billing_mode_locked: boolean | null;
  addendum_count: number | null;
}): OrderContract {
  const net = row.contract_net === null ? null : Number(row.contract_net);
  const source = SOURCES.find((value) => value === row.source) ?? 'none';
  return {
    contractNet: net !== null && Number.isFinite(net) ? net : null,
    source,
    sumLocked: row.sum_locked === true,
    billingModeLocked: row.billing_mode_locked === true,
    addendumCount: row.addendum_count ?? 0,
  };
}
