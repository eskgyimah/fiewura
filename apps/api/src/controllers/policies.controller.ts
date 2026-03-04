import { Request, Response } from 'express';

// Ghana housing policy summaries based on Rent Act 1963 (Act 220) and PNDCL 138
const GHANA_HOUSING_POLICIES = [
  {
    topic: 'rent_control',
    title: 'Rent Control — Rent Act 1963 (Act 220)',
    summary:
      'The Rent Control Department under the Ministry of Works and Housing regulates rent charges and resolves landlord-tenant disputes. Landlords must register all residential leases within 14 days. Rent advances are capped at 6 months for residential properties. Violations carry penalties up to GHS 6,000 or 2 years imprisonment.',
    key_points: [
      'Maximum rent advance: 6 months for residential properties (despite common practice of 1-2 years)',
      'All residential leases must be registered with Rent and Housing Committees within 14 days',
      'Non-compliance with registration prevents landlords from collecting rent',
      'Rent increases require approval from the Rent Control Department',
      'Landlord must provide a rent card or receipt for every payment',
      'Tenants can report excessive rent charges to Rent Control — free of charge',
      'Digital portal available at rentcontrol.mwh.gov.gh for online complaints (24-48hr response)',
      'Penalty for violating advance rent limit: up to GHS 6,000 fine or 2 years imprisonment',
    ],
  },
  {
    topic: 'eviction_rules',
    title: 'Eviction Rules — Sections 17-25 of Act 220',
    summary:
      'Eviction requires strict legal process. Landlords must obtain a court order — self-help evictions (changing locks, removing belongings) are criminal offences punishable by 200 penalty units or 6 months imprisonment. Courts must consider whether eviction causes greater hardship to the tenant.',
    key_points: [
      'Forceful/self-help eviction is illegal — penalty: 200 penalty units or 6 months imprisonment',
      'Valid grounds: non-payment (1 month default), lease violation, subletting without consent',
      'Landlord personal use requires 6 months written notice',
      'Property redevelopment requires 6 months written notice',
      '4-step legal process: Written notice → Form 7 application → Investigation → Court hearing',
      'Court must assess "greater hardship" — tenant vs landlord impact (Boateng v Dwinfuor [1979])',
      'Tenant can contest eviction at Rent Control Department or Rent Magistrate Court',
      'If landlord fails procedure, tenant remains as statutory tenant with full protections',
    ],
  },
  {
    topic: 'security_deposit',
    title: 'Security Deposit Regulations',
    summary:
      'Security deposits are typically 1-2 months rent. Landlords must return deposits at tenancy end, minus legitimate deductions for damages beyond normal wear and tear. Both parties should document property condition at move-in and move-out.',
    key_points: [
      'Typical deposit: 1-2 months rent',
      'Deposit must be returned at end of tenancy minus legitimate deductions',
      'Deductions only for damages beyond normal wear and tear',
      'Both parties should do joint property inspection at move-in and move-out',
      'Deposit disputes resolved at Rent Control Department — free mediation',
      'Landlord cannot use deposit as last month rent without agreement',
    ],
  },
  {
    topic: 'tenant_rights',
    title: 'Tenant Rights Under Ghanaian Law',
    summary:
      'Tenants have legally protected rights to habitable conditions, privacy, quiet enjoyment, and protection from unlawful eviction. The Rent Act guarantees these rights and provides free dispute resolution through the Rent Control Department.',
    key_points: [
      'Right to habitable and structurally safe living conditions',
      'Right to privacy — landlord must give 24 hours notice before entry (except emergencies)',
      'Right to quiet and peaceful enjoyment of the premises',
      'Protection from unlawful eviction, harassment, and lock changes',
      'Right to refuse unauthorized rent increases',
      'Cannot be evicted for filing complaints at Rent Control',
      'Right to essential utilities (water, electricity) as agreed — landlord cannot disconnect as coercion',
      'National Rental Assistance Scheme: government-backed advance rent loans at 12% interest',
    ],
  },
  {
    topic: 'landlord_obligations',
    title: 'Landlord Obligations',
    summary:
      'Landlords must maintain properties in habitable condition, register leases, issue receipts, and follow legal procedures for rent changes and evictions. Failure to comply can result in penalties and inability to collect rent.',
    key_points: [
      'Register all leases with Rent Control within 14 days — non-compliance = cannot collect rent',
      'Maintain property: structural soundness, adequate ventilation, basic amenities',
      'Carry out necessary repairs in reasonable time',
      'Issue proper receipts or rent cards for all payments received',
      'Cannot charge more than 6 months advance rent',
      'Cannot disconnect utilities to force eviction',
      'Must give adequate notice before property inspections (24 hours standard)',
      'Must follow legal eviction process — no self-help evictions',
    ],
  },
  {
    topic: 'dispute_resolution',
    title: 'Dispute Resolution Mechanisms',
    summary:
      'Disputes are resolved through a tiered system starting with the Rent Control Department (free), then mediation, ADR, and finally the courts. The digital portal at rentcontrol.mwh.gov.gh enables online complaint filing with 24-48 hour response times.',
    key_points: [
      'Step 1: File complaint at Rent Control Department — free, available in all regional capitals',
      'Step 2: Mediation through Rent Control officers',
      'Step 3: Alternative Dispute Resolution (ADR) if mediation fails',
      'Step 4: Rent Magistrate Court for unresolved cases',
      'Online complaints via rentcontrol.mwh.gov.gh (Ghana Card required)',
      'Response timeframe: 24-48 hours for online complaints',
      'CHRAJ (Commission on Human Rights) handles rights violations',
      'Legal Aid Scheme available for low-income tenants who cannot afford lawyers',
    ],
  },
];

// GET /api/policies
export const getPolicies = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({ policies: GHANA_HOUSING_POLICIES });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch policies' });
  }
};
