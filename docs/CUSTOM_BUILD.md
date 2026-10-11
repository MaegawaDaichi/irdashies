# irDashies Custom

This fork is a personal app that can be modified and updated independently of
official irDashies. The existing upstream widgets and automatic session profile
switching are included.

## App identity

| Item                       | Custom app                   |
| -------------------------- | ---------------------------- |
| Package name               | `irdashies-custom`           |
| Squirrel installer ID      | `irdashies_custom`           |
| Display name               | `irDashies Custom`           |
| Executable                 | `irdashies-custom.exe`       |
| Windows settings directory | `%APPDATA%\irDashies Custom` |
| Installer                  | `irDashies-Custom-Setup.exe` |

Electron uses the product name for its default user-data directory. Keep these
names stable in later custom builds to preserve settings and installer identity.
Official irDashies keeps its own settings and installation. The existing startup
guard disables official auto-updates because this app is not named `irdashies`.
Custom updates are manual for now; the publisher points at this fork if a custom
release is published explicitly. Publishing alone does not enable auto-updates.

## Build on Windows

Use Node.js 24 or newer, Python, and Visual Studio Build Tools with the Desktop
development with C++ workload and a Windows SDK. From the repository directory:

```powershell
npm ci
npm run irsdk:build
npm run make
```

The unsigned installer is under `out/make/squirrel.windows/x64/`. Install it next
to official irDashies. For development, run `npm start`. If type checking runs
out of memory, set `$env:NODE_OPTIONS = '--max-old-space-size=6144'` first.

Alternatively, push this branch to your fork, then run **Actions → Build Custom
Windows App → Run workflow**, selecting the custom branch. Download the
`irDashies-Custom-Windows` artifact when the build succeeds. It contains the
installer, Squirrel update files, and a ZIP of the packaged app. No signing
credentials or release publishing are needed. The official signed-release job
is restricted to the upstream repository.

## Copy settings from the official app

1. In official irDashies, select a profile and open Advanced Settings.
2. Export its dashboard JSON.
3. In irDashies Custom, create/select the destination profile and import the JSON.
4. Repeat for other profiles. Check positions and settings before driving.

Import replaces the selected dashboard; export it first if it has settings you
want to keep. This transfers widget configuration, visibility, positions, sizes,
and dashboard general settings. Profile names, app-wide preferences, history,
and referenced image files are not a complete part of a dashboard export.
New widget settings are filled from the current defaults when dashboards load.

For a full copy of profiles and app preferences, exit both apps and back up their
settings, then copy the official `%APPDATA%\irdashies\config.json` into
`%APPDATA%\irDashies Custom\config.json`. Copy required image assets separately;
paths in the configuration may also need updating. Do not share a writable
settings directory between the two apps. Configuration is compatible in the
old-to-new direction; do not copy custom settings back into an older release.

Running both apps can duplicate overlays and compete for global hotkeys. Use
one at a time when driving. The OBS web server tries alternate ports when 3000
is occupied; use the URL shown by the app you intend to capture.

## Keep upstream changes and personal changes

Keep `main` as an upstream tracking branch and maintain a separate `custom`
branch for the custom app. Merge reviewed feature branches into `custom`.
Configure the upstream remote once:

```sh
git remote add upstream https://github.com/tariknz/irdashies.git
```

For each upstream update, start from a clean working tree:

```sh
git fetch upstream
git switch main
git merge --ff-only upstream/main
git switch custom
git merge main
```

Resolve conflicts while preserving custom identity, the fork publisher, and the
release guard. Run lint, tests, and a Windows build before installing the update.
Bump the custom package version and the root version entries in package-lock.json
for each distributed update, and keep the same app name. Install the new custom
Setup.exe to update the custom app and retain its user-data directory.

The initial custom distribution changes are prepared on `feat/custom-distribution`.
After reviewing and committing them, create `custom` from that commit (or merge
the feature branch into an existing `custom` branch). Keep personal changes off
the upstream tracking branch.
