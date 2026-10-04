# RENTA

RENTA is a project for tenants, landlords and authorised agents to compare approved rental charges and documented property commitments with what is delivered at handover. It is designed to support a clear, shared review of the rental record; it does not claim that properties are verified or that payments are protected.

## Run locally

You will need [Node.js](https://nodejs.org/) 20.19 or newer and npm.

```bash
npm install
npm run dev
```

Open the local address shown in the terminal (usually `http://localhost:5173`).

To create and inspect a production build:

```bash
npm run build
npm run preview
```

Run the focused inspection and handover-summary tests with:

```bash
npm test
```

## Included in the current demo

- React, Vite and TypeScript project setup
- Responsive RENTA home page with accessible navigation
- Four introductory feature cards covering charges, commitments, evidence and handover decisions
- A read-only fictional sample rental with parties, property details and a planned handover date
- Agreed charges with a calculated total upfront cost and a clearly qualified demo approval status
- Three property commitments with deadlines, acceptance criteria and accessible status labels
- A browser-only demo inspection workflow with required-field and future-date validation
- A simulated landlord/tenant role switch (not authentication)
- Versioned landlord completion reports and tenant inspections
- Explicit tenant repair confirmation tied to the current report and inspection revisions
- Editable open objections that block affected confirmations and handover acceptance
- Explicit demo handover acceptance only after all commitments are confirmed by both parties
- Preserved historical confirmations and handover acceptances when records change
- Local activity history for reports, inspections, confirmations, objections and acceptance
- Versioned, RENTA-scoped browser storage with migration of valid earlier inspection records
- A scoped reset action that removes only the associated RENTA demo records
- Focused automated tests for workflow prerequisites, invalidation, migration and reset behaviour
- Reusable typed demo data in `src/data/sampleRental.ts`
- Navigation back to the home page
- Straightforward responsive CSS, page metadata and a custom favicon
- Production build and local preview scripts

The sample property and parties are fictional. Demo records stay in the current browser and are not shared or independently verified. The role switch is not authentication, and local history is not a secure audit trail. Handover acceptance does not authenticate a signature, confirm key transfer or authorise payment.

## Roadmap

### Implemented in the demo

- Approved rental charges and a calculated upfront total
- Documented property commitments and acceptance criteria
- Tenant inspection records
- Landlord completion reports
- Two-party repair confirmation using versioned records
- Tenant objections without reviewer resolution
- Conditional tenant handover acceptance
- Browser-local activity and transparency history

### Planned

1. Inspection photo uploads
2. Formal charge approval records
3. Reviewer decisions and objection resolution
4. Creating and managing rental records
5. User accounts, authenticated roles and shared storage
6. Landlord property listings
7. Tenant search and rental requests
8. Mutual ratings, comments, replies and reporting
9. Downloadable handover reports

Accounts, a backend, listings, uploads, ratings, reviewer resolution, payments and production verification services are intentionally outside the current step.
