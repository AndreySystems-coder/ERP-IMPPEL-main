## Packages
recharts | Beautiful dashboard analytics charts
date-fns | Formatting dates for transactions and leads
framer-motion | Smooth page transitions and micro-interactions
lucide-react | High quality vector icons
clsx | Conditional class names
tailwind-merge | Merging tailwind classes cleanly

## Notes
- Using space-separated HSL colors for Tailwind config
- Assuming standard REST JSON endpoints based on shared/routes.ts
- Authentication expects HTTP-only cookies session, checked via /api/auth/me
- Dates returned by API may be strings, using Date constructor to parse safely
