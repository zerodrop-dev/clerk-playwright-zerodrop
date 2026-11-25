// e2e/email-link.spec.ts
import { test, expect } from '@playwright/test'
import { setupClerkTestingToken } from '@clerk/testing/playwright'
import { createClerkClient } from '@clerk/backend'
import { ZeroDrop } from 'zerodrop-client'

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
const mail = new ZeroDrop() // reads ZERODROP_API_KEY

test('signs in with an email link', async ({ page, browser }) => {
  // A real address without +clerk_test, so Clerk sends the email
  const inbox = mail.generateInbox()
  const user = await clerk.users.createUser({
    emailAddress: [inbox],
    skipPasswordRequirement: true,
  })
  // Where the link gets opened: a browser context of its own, like an email client's
  const elsewhere = await browser.newContext()

  try {
    await setupClerkTestingToken({ page })
    await page.goto('/sign-in')
    await page.getByLabel(/email/i).fill(inbox)
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    // If sign-in offers several methods, pick the email link here

    const email = await mail.waitForLatest(inbox, { timeout: 30_000 })
    expect(email.magicLink).not.toBeNull()

    const linkPage = await elsewhere.newPage()
    await linkPage.goto(email.magicLink!)
    // Clerk reports the result in the URL it lands on, such as ?__clerk_status=verified
    await expect(linkPage).toHaveURL(/__clerk_status=verified/, { timeout: 30_000 })

    // The original tab finishes signing in
    await page.waitForFunction(() => Boolean((window as any).Clerk?.user))
  } finally {
    await elsewhere.close()
    await clerk.users.deleteUser(user.id)
  }
})
