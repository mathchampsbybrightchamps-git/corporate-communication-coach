# Feature Documentation: User Database Architecture & Supabase RLS Schema (11.2.1 – 11.2.10)

## 1. Feature Overview
The **User Database Architecture** handles user profile synchronization, username registry, daily usage quotas, and analytics categorization across 10 PostgreSQL tables and views in Supabase.

---

## 2. Why It Is Required
Provides secure, scalable user management, access control, and analytics tracking for corporate enterprise deployments.

---

## 3. Database Schema Overview
1. `public.profiles` (11.2.1 Master User Table)
2. `public.users_free` (11.2.2 Free Tier View)
3. `public.users_paid` (11.2.3 Paid/Pro Tier View)
4. `public.users_active` (11.2.4 DAU/MAU 30-Day Activity View)
5. `public.users_inactive` (11.2.5 Churn Analysis View)
6. `public.users_by_level` (11.2.6 Corporate Level Cohort View L1–L8)
7. `public.users_by_designation` (11.2.7 Designation Analytics View)
8. `public.users_by_department` (11.2.8 Department Analytics View)
9. `public.usernames` (11.2.9 Debounced Username Registry)
10. `public.daily_usage` (11.2.10 Daily Quotas Counter)

---

## 4. Security & RLS Policies
- Views configured with `WITH (security_invoker = true)` to inherit Row Level Security policies of underlying tables and eliminate Supabase `UNRESTRICTED` security badges.
- `UsernameChecker` in `SupabaseClient.js` enforces regex formatting (`/^[a-z0-9_.]{3,30}$/`), local result caching, and 500ms query debouncing.
