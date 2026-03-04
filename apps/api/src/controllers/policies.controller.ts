import { Request, Response } from 'express';

// Static Ghana housing policy summaries
const GHANA_HOUSING_POLICIES = {
  rent_control: {
    title: 'Rent Control (Rent Act, 1963 - Act 220)',
    summary:
      'The Rent Control Department regulates rent charges and tenant-landlord disputes in Ghana. Landlords must register properties and cannot charge excessive rent beyond government-approved rates. Rent advances are capped at six months for residential properties.',
    key_points: [
      'Maximum rent advance: 6 months for residential properties',
      'Landlord must provide a rent card or receipt for every payment',
      'Rent increases must be approved by the Rent Control Department',
      'Tenants can report excessive rent charges to Rent Control',
      'Rent Control offices operate in all regional capitals',
    ],
  },
  eviction_rules: {
    title: 'Eviction Rules Under Ghanaian Law',
    summary:
      'Eviction in Ghana requires proper legal process through the Rent Control Department or the courts. Landlords cannot forcefully evict tenants without a court order. Notice periods vary depending on the reason for eviction.',
    key_points: [
      'Forceful eviction without court order is illegal',
      '30 days notice for non-payment or lease violation',
      '90 days notice when landlord needs property for personal use',
      'Tenant can contest eviction at the Rent Control Department',
      'Police involvement in eviction requires valid court order',
      'Eviction cases can be escalated to the Rent Magistrate Court',
    ],
  },
  security_deposit: {
    title: 'Security Deposit Regulations',
    summary:
      'Security deposits in Ghana are typically one to two months rent. The Rent Act requires landlords to return deposits at the end of tenancy, minus legitimate deductions for damages beyond normal wear and tear.',
    key_points: [
      'Typical deposit: 1-2 months rent',
      'Deposit must be returned at end of tenancy',
      'Landlord may deduct for damages beyond normal wear and tear',
      'Deposit disputes can be resolved at Rent Control',
      'Landlord should document property condition at move-in and move-out',
    ],
  },
  tenant_rights: {
    title: 'Tenant Rights in Ghana',
    summary:
      'Tenants in Ghana have legally protected rights including the right to habitable living conditions, privacy, and protection from unlawful eviction. Tenants can seek redress at the Rent Control Department for violations.',
    key_points: [
      'Right to habitable and safe living conditions',
      'Right to privacy - landlord must give notice before entry',
      'Protection from unlawful eviction and harassment',
      'Right to receive receipts for all payments made',
      'Right to report issues to Rent Control without retaliation',
      'Right to essential utilities (water, electricity) as agreed',
    ],
  },
  landlord_obligations: {
    title: 'Landlord Obligations',
    summary:
      'Landlords in Ghana are required to maintain properties in habitable condition, provide basic amenities as agreed, and comply with Rent Control regulations. Failure to meet obligations can result in penalties.',
    key_points: [
      'Maintain property in habitable condition',
      'Carry out necessary structural repairs',
      'Provide basic amenities as agreed in tenancy terms',
      'Register property with Rent Control Department',
      'Issue proper receipts for all payments received',
      'Give adequate notice before property inspections',
      'Not disconnect utilities as a means of forcing eviction',
    ],
  },
  dispute_resolution: {
    title: 'Dispute Resolution Mechanisms',
    summary:
      'Tenant-landlord disputes in Ghana can be resolved through the Rent Control Department, Alternative Dispute Resolution (ADR), or the courts. The Rent Control Department is the first point of contact for most housing disputes.',
    key_points: [
      'Step 1: File complaint at Rent Control Department (free)',
      'Step 2: Mediation through Rent Control officers',
      'Step 3: Alternative Dispute Resolution (ADR) if mediation fails',
      'Step 4: Rent Magistrate Court for unresolved cases',
      'Commission on Human Rights and Administrative Justice (CHRAJ) for rights violations',
      'Legal Aid Scheme available for low-income tenants',
    ],
  },
};

// GET /api/policies - Return Ghana housing policy summaries
export const getPolicies = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json(GHANA_HOUSING_POLICIES);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch policies' });
  }
};
