// Plans: only 2. Free = welcome + support bots for 1 day. Premium = every bot, Rs 20 for 30 days.
export const PREMIUM_PRICE = 20;
export const PREMIUM_DAYS = 30;
export const FREE_MODULES = ['welcome', 'support'];
export const UPI_ID = process.env.NEXT_PUBLIC_UPI_ID || '7742936593@fam';
export const UPI_NAME = process.env.NEXT_PUBLIC_UPI_NAME || 'rahul kumar';

export type PlanState = {
  premium: boolean;
  premium_until: string | null;
  free_started_at: string | null;
  free_expires_at: string | null;
  free_expired: boolean;
};
