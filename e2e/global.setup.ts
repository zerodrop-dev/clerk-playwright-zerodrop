import { clerkSetup } from '@clerk/testing/playwright'
import { test as setup } from '@playwright/test'

// As in Clerk's Playwright guide: get a testing token before any test runs.
setup.describe.configure({ mode: 'serial' })

setup('clerk setup', async () => {
  await clerkSetup()
})
