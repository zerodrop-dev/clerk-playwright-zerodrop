# clerk-playwright-zerodrop

[![zerodrop-client](https://img.shields.io/npm/v/zerodrop-client.svg?label=zerodrop-client)](https://www.npmjs.com/package/zerodrop-client)
[![@clerk/testing](https://img.shields.io/npm/v/@clerk/testing.svg?label=%40clerk%2Ftesting)](https://www.npmjs.com/package/@clerk/testing)

> Testing Clerk email links with Playwright and ZeroDrop, now that Clerk no longer emails `+clerk_test` addresses.

**Checked on Nov 25, 2026 against a real Clerk development instance: both tests passed** (the email-link test in
28 seconds).

Since [Clerk's change of Oct 26, 2026](https://clerk.com/changelog/2026-10-26-test-email-addresses-no-longer-receive-email),
Clerk sends no email to `+clerk_test` addresses while Test mode is on. A test that follows a sign-in link from an
email now needs a real address. This repo signs in with an email link end to end: your Clerk development instance
sends the email to a ZeroDrop inbox, and the test opens the link.

The write-up behind it:
[Clerk Stopped Emailing +clerk_test Addresses: How to Test Email Links Now](https://zerodrop.dev/blog/clerk-test-mode-email-links).

```bash
git clone https://github.com/zerodrop-dev/clerk-playwright-zerodrop
cd clerk-playwright-zerodrop
npm ci
cp .env.example .env   # add CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY and ZERODROP_API_KEY
npx playwright install chromium
npm test
```

## Set up Clerk (once)

1. Create an application in the [Clerk Dashboard](https://dashboard.clerk.com). It starts with a development
   instance, where Test mode is on by default.
2. In **User & authentication**, under **Email**, turn on **Email verification link** and turn off **Require the
   same device and browser**. In a development instance, Clerk treats the page that opens the link as a different
   browser, even in the same Playwright browser, so with that setting on, the link is refused ("Verification link
   is invalid for this device").
3. For this test, turn off the email verification code, and turn off **Sign-up with password** under
   **Password**, so that sign-in goes straight to the link.
4. On the **API keys** page, copy the publishable key and the secret key into `.env`.

## ZeroDrop key

Get a free key at [zerodrop.dev/keys](https://zerodrop.dev/keys) (sign in with GitHub) and put it in `.env` as
`ZERODROP_API_KEY`. With a key, only your key reads your inboxes and your account can receive up to 300 emails a
day. Without one, inboxes are public, and one sender reaches at most 5 different inboxes a day.

## What this tests

| Test file | Clerk flow | ZeroDrop field |
|---|---|---|
| `e2e/email-link.spec.ts` | Sign-in with an email link, Test mode on, a real address | `email.magicLink` |

Each run creates a Clerk user with a fresh ZeroDrop address, signs in through Clerk's prebuilt sign-in, waits for
the email, opens the link in a browser context of its own, checks that Clerk verified it, waits until the original
tab has a signed-in user, and deletes the user. Its
emails come from your development instance and count toward that instance's email limits (see Clerk's
[test emails and phones](https://clerk.com/docs/guides/development/testing/test-emails-and-phones) page). A passing
run on Nov 25, 2026 got two: the sign-in link, and seven seconds later a second email with no link, most likely Clerk's
notice of a sign-in from a new device.

## How it works

```typescript
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
const mail = new ZeroDrop() // reads ZERODROP_API_KEY

// A real address without +clerk_test, so Clerk sends the email
const inbox = mail.generateInbox()
const user = await clerk.users.createUser({ emailAddress: [inbox], skipPasswordRequirement: true })

// ...sign in with that address, then:
const email = await mail.waitForLatest(inbox, { timeout: 30_000 })
const linkPage = await (await browser.newContext()).newPage()
await linkPage.goto(email.magicLink!)
await expect(linkPage).toHaveURL(/__clerk_status=verified/)
```

`email.magicLink` comes back already extracted: Clerk's sign-in links point at its Frontend API's `/v1/verify`
path. The link is opened outside the test's own browser context, because `setupClerkTestingToken()` routes that
context's requests to Clerk through Playwright, the link included. The whole test is in
[`e2e/email-link.spec.ts`](e2e/email-link.spec.ts).

## Project structure

```
clerk-playwright-zerodrop/
├── e2e/
│   ├── global.setup.ts      # clerkSetup(): gets a Clerk testing token before the tests
│   └── email-link.spec.ts   # the test from the write-up
├── server.mjs               # a bare page with Clerk's prebuilt sign-in, from Clerk's script tags
├── playwright.config.ts
└── .env.example
```

## Notes

- Tests that only need a signed-in user can keep `+clerk_test` addresses and the code `424242`. Use a real address
  only where the email itself is under test.
- `server.mjs` loads Clerk the way Clerk's JavaScript quickstart does, with the `@clerk/ui@1` and
  `@clerk/clerk-js@6` script tags from your instance, so there's no framework to install.
- Dependencies are pinned exactly in `package.json` and `package-lock.json`.
- On Windows, our runs printed `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c` after
  the setup step. It comes from Node, not from the tests, and the runs carried on: the second one passed.
