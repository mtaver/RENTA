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
- Editable inspection records saved under a RENTA-specific localStorage key
- A calculated handover summary with passed, failed and unassessed counts
- A scoped reset action that removes only RENTA demo inspection data
- Focused automated tests for the handover decision rules and stored-data parsing
- Reusable typed demo data in `src/data/sampleRental.ts`
- Navigation back to the home page
- Straightforward responsive CSS, page metadata and a custom favicon
- Production build and local preview scripts

The sample property and parties are fictional. Inspection records stay in the current browser and are not shared or independently verified. Authentication, databases, uploads, payment handling, AI, property acceptance and real verification services remain outside this demo.
