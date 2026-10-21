// Plan catalog — amounts in INR. Free simple hosting never expires.
export const UPI_ID = process.env.NEXT_PUBLIC_UPI_ID || '7742936593@fam';
export const UPI_NAME = process.env.NEXT_PUBLIC_UPI_NAME || 'rahul kumar';

/** Modules available on the free plan forever (simple bot hosting). */
export const FREE_MODULES = ['welcome', 'support', 'simple'];

export type PlanId = 'starter' | 'pro' | 'vip' | 'admin_panel';

export type PlanDef = {
  id: PlanId;
  name: string;
  price: number;
  days: number;
  tagline: string;
  features: string[];
  /** Grants full bot modules + premium listing boost */
  grantsPremium: boolean;
  /** Grants limited admin panel (ban / badge / grant premium only) */
  grantsAdminPanel: boolean;
  vip: boolean;
};

export const PLANS: PlanDef[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 20,
    days: 2,
    tagline: 'All bots for 2 days',
    features: [
      'All bot modules unlocked',
      'High promotion on listings',
      'Valid for 2 days only',
      'When it ends, premium bots go offline — renew to continue',
    ],
    grantsPremium: true,
    grantsAdminPanel: false,
    vip: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 299,
    days: 15,
    tagline: '15 days full hosting',
    features: [
      'All bot modules',
      '15 days hosting',
      'Premium listing boost',
      'Priority support',
    ],
    grantsPremium: true,
    grantsAdminPanel: false,
    vip: false,
  },
  {
    id: 'vip',
    name: 'VIP',
    price: 500,
    days: 60,
    tagline: '2 months + VIP treatment',
    features: [
      'All bot modules',
      '60 days (2 months) hosting',
      'VIP profile badge',
      'Highest promotion priority',
      'Dedicated support channel access',
    ],
    grantsPremium: true,
    grantsAdminPanel: false,
    vip: true,
  },
  {
    id: 'admin_panel',
    name: 'Admin Panel',
    price: 799,
    days: 7,
    tagline: 'Limited staff tools · 7 days',
    features: [
      'Access to Admin panel only',
      'Valid for 7 days only',
      'Ban / unban users',
      'Grant verified badges',
      'Grant premium to users',
      'Cannot assign staff roles',
      'No Moderator / Helper / Staff / Acting Owner panels',
    ],
    grantsPremium: false,
    grantsAdminPanel: true,
    vip: false,
  },
];

export function getPlan(id: string | null | undefined): PlanDef | undefined {
  return PLANS.find((p) => p.id === id);
}

/** @deprecated use PLANS starter */
export const PREMIUM_PRICE = 20;
/** @deprecated use PLANS starter */
export const PREMIUM_DAYS = 2;

export type PlanState = {
  premium: boolean;
  premium_until: string | null;
  free_started_at: string | null;
  free_expires_at: string | null;
  free_expired: boolean;
  admin_panel?: boolean;
  admin_panel_until?: string | null;
  vip?: boolean;
  plan_id?: string | null;
};
