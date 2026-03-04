import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';

interface Policy {
  topic: string;
  title: string;
  summary: string;
  key_points: string[];
}

const GHANA_HOUSING_POLICIES: Policy[] = [
  {
    topic: 'rent_control',
    title: 'Rent Control \u2014 Rent Act 1963 (Act 220)',
    summary: 'The Rent Control Department under the Ministry of Works and Housing regulates rent charges and resolves landlord-tenant disputes. Landlords must register all residential leases within 14 days. Rent advances are capped at 6 months for residential properties.',
    key_points: [
      'Maximum rent advance: 6 months for residential properties',
      'All residential leases must be registered with Rent and Housing Committees within 14 days',
      'Non-compliance with registration prevents landlords from collecting rent',
      'Rent increases require approval from the Rent Control Department',
      'Landlord must provide a rent card or receipt for every payment',
      'Tenants can report excessive rent charges to Rent Control \u2014 free of charge',
      'Penalty for violating advance rent limit: up to GHS 6,000 fine or 2 years imprisonment',
    ],
  },
  {
    topic: 'eviction_rules',
    title: 'Eviction Rules \u2014 Sections 17-25 of Act 220',
    summary: 'Eviction requires strict legal process. Landlords must obtain a court order \u2014 self-help evictions (changing locks, removing belongings) are criminal offences punishable by 200 penalty units or 6 months imprisonment.',
    key_points: [
      'Forceful/self-help eviction is illegal \u2014 penalty: 200 penalty units or 6 months imprisonment',
      'Valid grounds: non-payment (1 month default), lease violation, subletting without consent',
      'Landlord personal use requires 6 months written notice',
      'Property redevelopment requires 6 months written notice',
      '4-step legal process: Written notice \u2192 Form 7 application \u2192 Investigation \u2192 Court hearing',
      'Tenant can contest eviction at Rent Control Department or Rent Magistrate Court',
    ],
  },
  {
    topic: 'security_deposit',
    title: 'Security Deposit Regulations',
    summary: 'Security deposits are typically 1-2 months rent. Landlords must return deposits at tenancy end, minus legitimate deductions for damages beyond normal wear and tear.',
    key_points: [
      'Typical deposit: 1-2 months rent',
      'Deposit must be returned at end of tenancy minus legitimate deductions',
      'Deductions only for damages beyond normal wear and tear',
      'Both parties should do joint property inspection at move-in and move-out',
      'Deposit disputes resolved at Rent Control Department \u2014 free mediation',
      'Landlord cannot use deposit as last month rent without agreement',
    ],
  },
  {
    topic: 'tenant_rights',
    title: 'Tenant Rights Under Ghanaian Law',
    summary: 'Tenants have legally protected rights to habitable conditions, privacy, quiet enjoyment, and protection from unlawful eviction.',
    key_points: [
      'Right to habitable and structurally safe living conditions',
      'Right to privacy \u2014 landlord must give 24 hours notice before entry (except emergencies)',
      'Right to quiet and peaceful enjoyment of the premises',
      'Protection from unlawful eviction, harassment, and lock changes',
      'Right to refuse unauthorized rent increases',
      'Cannot be evicted for filing complaints at Rent Control',
      'Right to essential utilities (water, electricity) \u2014 landlord cannot disconnect as coercion',
      'National Rental Assistance Scheme: government-backed advance rent loans at 12% interest',
    ],
  },
  {
    topic: 'landlord_obligations',
    title: 'Landlord Obligations',
    summary: 'Landlords must maintain properties in habitable condition, register leases, issue receipts, and follow legal procedures for rent changes and evictions.',
    key_points: [
      'Register all leases with Rent Control within 14 days',
      'Maintain property: structural soundness, adequate ventilation, basic amenities',
      'Carry out necessary repairs in reasonable time',
      'Issue proper receipts or rent cards for all payments received',
      'Cannot charge more than 6 months advance rent',
      'Cannot disconnect utilities to force eviction',
      'Must give adequate notice before property inspections (24 hours standard)',
      'Must follow legal eviction process \u2014 no self-help evictions',
    ],
  },
  {
    topic: 'dispute_resolution',
    title: 'Dispute Resolution Mechanisms',
    summary: 'Disputes are resolved through a tiered system starting with the Rent Control Department (free), then mediation, ADR, and finally the courts.',
    key_points: [
      'Step 1: File complaint at Rent Control Department \u2014 free, available in all regional capitals',
      'Step 2: Mediation through Rent Control officers',
      'Step 3: Alternative Dispute Resolution (ADR) if mediation fails',
      'Step 4: Rent Magistrate Court for unresolved cases',
      'Response timeframe: 24-48 hours for online complaints',
      'CHRAJ (Commission on Human Rights) handles rights violations',
      'Legal Aid Scheme available for low-income tenants who cannot afford lawyers',
    ],
  },
];

export default function PoliciesPage() {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string | null>(null);
  const policies = GHANA_HOUSING_POLICIES;

  const ICONS: Record<string, string> = {
    rent_control: '💰', eviction_rules: '🚪', security_deposit: '🔒',
    tenant_rights: '⚖️', landlord_obligations: '🏠', dispute_resolution: '🤝',
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-gray-800 text-white p-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold">Ghana Housing Policies</h1>
          <p className="text-gray-300 text-sm">Know your rights and obligations</p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {policies.length === 0 && <p className="text-center text-gray-500 py-8">No policies loaded</p>}
        {policies.map(p => (
          <div key={p.topic} className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <button onClick={() => setExpanded(expanded === p.topic ? null : p.topic)}
              className="w-full p-4 flex items-center gap-3 text-left">
              <span className="text-2xl">{ICONS[p.topic] || '📋'}</span>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{p.title}</p>
                <p className="text-xs text-gray-500 line-clamp-1">{p.summary}</p>
              </div>
              <span className="text-gray-400">{expanded === p.topic ? '▲' : '▼'}</span>
            </button>
            {expanded === p.topic && (
              <div className="border-t px-4 pb-4">
                <p className="text-sm text-gray-700 mt-3 mb-3">{p.summary}</p>
                <h4 className="text-xs font-semibold text-gray-500 mb-2">KEY POINTS</h4>
                <ul className="space-y-1.5">
                  {p.key_points.map((point, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700">
                      <span className="text-green-500 flex-shrink-0">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  );
}
