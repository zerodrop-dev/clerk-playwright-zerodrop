// A bare page with Clerk's prebuilt sign-in, loaded from your Clerk instance with the two script
// tags from Clerk's JavaScript quickstart. Serves it at / and /sign-in. No build step, no framework.
import http from 'node:http'

try {
  process.loadEnvFile('.env')
} catch {
  // No .env: use the shell's environment.
}

const publishableKey = process.env.CLERK_PUBLISHABLE_KEY
if (!publishableKey) throw new Error('CLERK_PUBLISHABLE_KEY is missing: set it in .env (see .env.example)')

// The Frontend API domain is base64-encoded in the publishable key, followed by "$".
const frontendApi = Buffer.from(publishableKey.split('_')[2] ?? '', 'base64').toString('utf8').replace(/\$$/, '')
if (!/^[a-z0-9.-]+$/i.test(frontendApi)) throw new Error('CLERK_PUBLISHABLE_KEY does not look like a Clerk publishable key')

const port = Number(process.env.PORT ?? 3123)

const page = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Clerk email-link check</title>
  </head>
  <body>
    <div id="app"></div>
    <script defer crossorigin="anonymous" type="text/javascript"
      src="https://${frontendApi}/npm/@clerk/ui@1/dist/ui.browser.js"></script>
    <script defer crossorigin="anonymous" type="text/javascript"
      data-clerk-publishable-key="${publishableKey}"
      src="https://${frontendApi}/npm/@clerk/clerk-js@6/dist/clerk.browser.js"></script>
    <script>
      window.addEventListener('load', async () => {
        await Clerk.load({ ui: { ClerkUI: window.__internal_ClerkUICtor } })
        const app = document.getElementById('app')
        if (Clerk.isSignedIn) {
          app.innerHTML = '<p id="signed-in">Signed in as <span id="who"></span></p><div id="user-button"></div>'
          document.getElementById('who').textContent = Clerk.user?.primaryEmailAddress?.emailAddress ?? ''
          Clerk.mountUserButton(document.getElementById('user-button'))
        } else {
          app.innerHTML = '<div id="sign-in"></div>'
          Clerk.mountSignIn(document.getElementById('sign-in'))
        }
      })
    </script>
  </body>
</html>
`

http
  .createServer((req, res) => {
    const path = new URL(req.url ?? '/', 'http://localhost').pathname
    if (path === '/' || path === '/sign-in' || path.startsWith('/sign-in/')) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
      res.end(page)
    } else if (path === '/favicon.ico') {
      res.writeHead(204)
      res.end()
    } else {
      res.writeHead(404, { 'content-type': 'text/plain' })
      res.end('Not found')
    }
  })
  .listen(port, () => console.log(`Clerk email-link check page on http://localhost:${port} (Frontend API ${frontendApi})`))
