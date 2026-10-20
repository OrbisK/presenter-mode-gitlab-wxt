# Contributing

## Development

```sh
pnpm dev              # Chrome, with HMR — needs an interactive terminal
pnpm dev:firefox
pnpm compile          # vue-tsc typecheck
pnpm build            # pnpm build:firefox for the Firefox target
pnpm zip
```

`pnpm compile` and both builds are what CI gates on, so run them before opening a pull request.

### Testing against a real instance

`pnpm dev` launches Chrome with a **fresh temporary profile**, which is not signed in to your
GitLab, so there are no internal notes to hide. Use the production build in the profile where your
GitLab session lives:

```sh
pnpm build
# chrome://extensions -> Developer mode -> Load unpacked -> .output/chrome-mv3
```

Chrome only applies the manifest's suggested shortcut on a fresh install; after changing it, remove
and re-add the extension or set it at `chrome://extensions/shortcuts`.

## Layout

| Path | What it does |
| --- | --- |
| `utils/presenter-mode.ts` | The single stored on/off flag everything else reads and writes |
| `utils/instances.ts` | The self-managed instance allowlist and its host permissions |
| `entrypoints/background.ts` | Keyboard shortcut, toolbar badge, content script registration for added instances |
| `entrypoints/content/` | Sets `data-gl-presenter-mode` on `<html>` and mounts the indicator pill |
| `entrypoints/content/style.css` | All hiding rules, scoped to that attribute |
| `entrypoints/popup/` | On/off toggle and "Enable on this instance" |
| `entrypoints/options/` | Instance list |

## Instances

`gitlab.com` is declared in the manifest. Every other origin is opt-in: it is stored in
`sync:instanceOrigins`, granted through `optional_host_permissions`, and the background registers
one dynamic content script (`presenter-mode-instances`) covering every origin it holds permission
for — re-synced on startup, install, permission changes and list changes. The registration names
the emitted bundle paths literally, so renaming `entrypoints/content/` means updating
`entrypoints/background.ts` too.

`enableInstance` stores the origin *before* the permission prompt resolves, because Firefox closes
the popup when the prompt opens. A denied origin therefore stays listed as **no access** on the
options page, with a Grant button.

Hiding is CSS-only and injected via the manifest at `document_start`, so nothing confidential
flashes before the rules apply, and GitLab's lazily rendered discussions are covered without a
`MutationObserver`. GitLab's markup changes between versions — keep selectors in `style.css`, with
`data-testid` fallbacks alongside class names.

## Releasing

Releases are driven by [uppt](https://github.com/danielroe/uppt) from Conventional Commits. Nobody
edits a version by hand; `.github/workflows/release.yml` runs three jobs across three triggers:

| Trigger | Job | What happens |
| --- | --- | --- |
| push to `main` | `pr` (`uppt/pr`) | Parses commits since the last tag, opens or updates a draft `release/vX.Y.Z` PR bumping `version` in `package.json` |
| that PR merging | `release` (`uppt/release`) | Tags the squash commit, cuts a GitHub release from the PR body, dispatches this workflow on the tag |
| `workflow_dispatch` on a `v*` tag | `assets` | Type check, zip both targets, attach the zips to the release |

Only `feat`/`fix`/`perf`-style commits produce a release (`chore(deps)` is ignored), and while the
major version is `0`, uppt demotes bumps one level — a `feat:` is a patch, a breaking change is a
minor.

The release PR body is the changelog, and it is editable: anything you write above the
`## 👉 Changelog` heading survives regeneration and lands in the GitHub release notes.

Rebuilding the assets for an existing tag is **Run workflow** on this workflow with the `v*` tag
selected; the zips are re-uploaded with `--clobber`.

One repository setting uppt needs: **Allow GitHub Actions to create and approve pull requests**
under Settings → Actions → General, or `uppt/pr` gets a 403 when opening the release PR.

### Store submission

Not wired up yet — releases are GitHub releases with installable zips. To turn it on, add these
repository secrets and `wxt submit` steps to the `assets` job, *after* the release upload:

| Store | Secrets | Step |
| --- | --- | --- |
| Chrome Web Store | `CHROME_EXTENSION_ID`, `CHROME_CLIENT_ID`, `CHROME_CLIENT_SECRET`, `CHROME_REFRESH_TOKEN` | `pnpm exec wxt submit --chrome-zip .output/*-chrome.zip` |
| Firefox Add-ons | `FIREFOX_EXTENSION_ID`, `FIREFOX_JWT_ISSUER`, `FIREFOX_JWT_SECRET` | `pnpm exec wxt submit --firefox-zip .output/*-firefox.zip --firefox-sources-zip .output/*-sources.zip` |

`pnpm exec wxt submit init` walks through obtaining the credentials. The Firefox id in
`wxt.config.ts` (`presenter-mode-for-gitlab@local`) is a placeholder and must match the id
registered on AMO.

## Store listing requirements

GitLab's [trademark guidelines](https://handbook.gitlab.com/handbook/marketing/brand-and-product-marketing/brand/brand-activation/trademark-guidelines/)
require a name that does not lead with "GitLab" (hence **Presenter Mode for GitLab**), the
non-affiliation notice from the README in the listing, and no GitLab logo in the icon or
screenshots.
