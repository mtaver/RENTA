export type CommitmentStatus =
  | 'Awaiting inspection'
  | 'In progress'
  | 'Reported complete'

export interface RentalCharge {
  label: string
  amount: number
}

export interface PropertyCommitment {
  id: string
  title: string
  deadline: string
  acceptanceCriteria: string
  status: CommitmentStatus
}

export interface SampleRental {
  property: string
  location: string
  tenant: string
  landlord: string
  agent: string
  plannedHandover: string
  approvalStatus: string
  charges: RentalCharge[]
  commitments: PropertyCommitment[]
  handover: {
    decision: string
    outstandingItems: string
    evidenceStatus: string
  }
}

export const sampleRental: SampleRental = {
  property: 'Two-bedroom apartment',
  location: 'Makurdi, Benue State',
  tenant: 'Demo Tenant',
  landlord: 'Demo Landlord',
  agent: 'Demo Agent',
  plannedHandover: '10 November 2026',
  approvalStatus: 'Approved — demo record',
  charges: [
    { label: 'Annual rent', amount: 1_200_000 },
    { label: 'Agent fee', amount: 120_000 },
    { label: 'Refundable caution deposit', amount: 100_000 },
  ],
  commitments: [
    {
      id: 'bathroom-fittings',
      title: 'Install bathroom fittings',
      deadline: '8 November 2026',
      acceptanceCriteria: 'All agreed fittings installed securely, with no visible leaks during testing.',
      status: 'Awaiting inspection',
    },
    {
      id: 'water-supply',
      title: 'Restore water supply',
      deadline: '9 November 2026',
      acceptanceCriteria: 'Water runs from kitchen and bathroom taps during inspection.',
      status: 'In progress',
    },
    {
      id: 'window-lock',
      title: 'Repair bedroom window lock',
      deadline: '9 November 2026',
      acceptanceCriteria: 'Window closes and locks securely.',
      status: 'Reported complete',
    },
  ],
  handover: {
    decision: 'Pending review',
    outstandingItems: 'All three commitments require inspection and acceptance.',
    evidenceStatus: 'No inspection evidence has been submitted.',
  },
}

export const totalUpfrontCost = sampleRental.charges.reduce(
  (total, charge) => total + charge.amount,
  0,
)
