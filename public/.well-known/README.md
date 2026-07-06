# .well-known — iOS Universal Links + credentials

## `apple-app-site-association` (AASA)

Serves at: `https://gleeworld.org/.well-known/apple-app-site-association`

Enables:
- **Universal Links** — tapping any `gleeworld.org` link on iOS opens the app if installed
- **Shared Web Credentials** — password autofill from Safari into the app and vice versa

### One-time setup needed before this works

1. **Fill in the Team ID.** Every `REPLACE_WITH_TEAM_ID` in the file becomes your 10-character Apple Team ID (find it in [Apple Developer → Membership](https://developer.apple.com/account/#!/membership/)). Result looks like `A1B2C3D4E5.org.gleeworld.app`.
2. **In Xcode**, add the **Associated Domains** capability to the app target and list:
   - `applinks:gleeworld.org`
   - `webcredentials:gleeworld.org`
3. **Serve with `Content-Type: application/json`**. The file has no extension, so nginx needs an explicit MIME override — add to the `server { … }` block:
   ```nginx
   location = /.well-known/apple-app-site-association {
       default_type application/json;
       add_header Cache-Control "public, max-age=3600";
   }
   ```
   Apple's fetcher **won't accept** `text/html` or `text/plain`.
4. **Verify**: `curl -I https://gleeworld.org/.well-known/apple-app-site-association` should return `Content-Type: application/json` and 200.
5. **Test on-device**: after the app update ships, share a `gleeworld.org` URL in Messages to yourself; long-press → the "Open in GleeWorld" option should appear.

### Debugging

- Apple caches the AASA file. Force a re-fetch by reinstalling the app.
- Apple's App Search API fetcher: https://app-site-association.cdn-apple.com/a/v1/gleeworld.org (visit that in a browser to see what Apple has cached — may show 404 until the app update using this file ships).
- Not working after the above? Check that CDN / Cloudflare isn't stripping the file or rewriting Content-Type.
