# Production Deployment Notes

## Vercel Rollback

Vercel keeps immutable deployments, so application rollback is done by promoting or rolling back to a previous known-good deployment in the Vercel dashboard or with `vercel rollback`.

## Database Migrations

Production database changes are forward-only. Use:

```bash
npx prisma migrate deploy
```

Do not use `prisma migrate dev` against production. If a code rollback crosses a database migration, verify the older code remains compatible with the already-applied schema or ship a forward fix.

## Build

The production build runs `prisma generate` before `next build` through `npm run build`.

Required production environment variables are listed in `.env.example`. At minimum, production needs database, auth, Stripe, Cloudinary, email, cron, and app URL values configured before release.
