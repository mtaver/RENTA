# RENTA

RENTA is being built as a multi-user rental platform where landlords submit listings, agency staff review them, and tenants can progress eligible rental interactions into documented charge, repair, inspection, objection and handover workflows.

This step adds the real account and database foundation. It does not claim that a property is verified or that a payment is protected.

## What is implemented

- Supabase email/password sign-up, email-verification return handling, sign-in, password reset and sign-out
- Restored browser sessions through the official Supabase client
- A protected account dashboard with an editable profile name and tenant/landlord capabilities; one user may have both
- Agency membership in a separate, non-user-editable `agency_staff` table
- An agency dashboard placeholder for authenticated staff
- PostgreSQL migration with row-level security and column-level grants
- Automatic profile creation when Supabase Auth creates a user
- A clear configuration-required screen when Supabase environment values are absent
- Existing fictional workflow retained under **Local demo**, with its browser storage and role switch unchanged and separate from real accounts
- Automated profile-validation and protected-navigation checks alongside the existing workflow tests

Listings, listing approval, interest, proposals, messaging, mediation, shared production rental records, payments and ratings are planned and are not implemented in this step.

## Local development

Prerequisites: Node.js 20.19 or newer and npm (or pnpm).

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open the address printed by Vite, normally `http://localhost:5173`.

Run checks:

```bash
npm test
npm run build
```

## Supabase setup

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local`.
3. In Supabase **Project Settings → API**, copy the project URL and publishable key into:

   ```dotenv
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```

   Only these public browser values belong in the frontend. Never add a service-role key, secret key, password or token to a Vite environment variable or Git.

4. Apply the version-controlled migration with the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started):

   ```bash
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```

   Alternatively, review and run `supabase/migrations/20261004000100_account_foundation.sql` in the project SQL editor.

5. In **Authentication → URL Configuration**, set the site URL for the environment and allow these redirect URLs during local development:

   ```text
   http://localhost:5173/account/verified
   http://localhost:5173/account/reset
   ```

   Add the exact deployed equivalents later. Configure email templates and an SMTP provider before production use.

6. Start or restart Vite after changing `.env.local`.

Without valid environment values, RENTA deliberately shows a configuration-required state. Authentication has not been verified against a live Supabase project in this repository checkout.

## Database permissions

The migration creates:

- `public.profiles`: a private row per authenticated user. A user can read only their row and update only `display_name`, `is_landlord` and `is_tenant`.
- `public.agency_staff`: trusted agency membership. An authenticated user can read only their own membership and has no browser permission to insert, update or delete staff rows.

Both tables have RLS enabled. Signed-out (`anon`) access is revoked. The public client cannot change user IDs, timestamps, another profile or agency membership. The sign-up trigger accepts only profile name and tenant/landlord capability metadata; it never creates staff membership.

The optional pgTAP policy checks are in `supabase/tests/account_permissions.sql`. With the Supabase CLI and local stack available, run:

```bash
supabase start
supabase db reset
supabase test db
```

They check profile isolation, permitted self-update and denial of self-assigned staff membership.

## Provision the first agency reviewer

There is intentionally no public staff-registration page. After the person has created and verified a normal account, a trusted project administrator can use the Supabase SQL editor (or a controlled server-side administration process) to assign membership:

```sql
insert into public.agency_staff (user_id, staff_role, assigned_by)
select id, 'reviewer', id
from auth.users
where email = 'reviewer@example.com'
on conflict (user_id) do update
set staff_role = excluded.staff_role,
    assigned_at = now(),
    assigned_by = excluded.assigned_by;
```

Replace the email with the verified reviewer’s address. Run this only through a trusted administrative connection. Do not put a service-role key in the browser, `.env.local` values prefixed with `VITE_`, source code or Git.

## Local demo separation

The sample rental and parties are fictional. Its workflow data stays in existing RENTA-scoped `localStorage` and IndexedDB records in the current browser. The Local demo role switch is simulated, not authenticated or independent, and has no effect on real account permissions. Real account pages derive access from the authenticated Supabase session, profile row and separate agency membership row. Existing demo records are not uploaded or migrated to Supabase.

## Next product steps (not built yet)

1. Landlord listing submission and agency listing approval
2. Tenant browsing, interest and proposals
3. Private landlord/tenant messaging and assigned agency mediation
4. Linking accepted negotiations to shared charge, repair, inspection, objection and handover records
5. Eligibility-based mutual ratings and comments
