# ApkStart User Manual & Troubleshooting

> Version: v0.6.4 · Platform: Windows 10/11 x64 · Updated: 2026-11-22
>
> ApkStart is an Android app runner for Windows: **it lets Android apps install, appear on the desktop, and run with a double-click, just like native Windows software.**
> This manual first teaches you how to use it, then gives step-by-step fixes organized by symptom. Every step matches a real button or menu in the app.

---

## Contents

1. [ApkStart in 30 seconds](#1-apkstart-in-30-seconds)
2. [Installation & first launch](#2-installation-first-launch)
3. [Everyday use](#3-everyday-use)
4. [Three core concepts (the key to understanding errors)](#4-three-core-concepts-the-key-to-understanding-errors)
5. [Do this first when something goes wrong: checkup & auto-detect](#5-do-this-first-when-something-goes-wrong-checkup-auto-detect)
6. [Common problems & fixes](#6-common-problems-fixes)
   - [6.1 "Hardware acceleration not enabled" / slow boot](#6-1-hardware-acceleration-not-enabled-slow-boot)
   - [6.2 Installation failed (INSTALL_FAILED_*)](#6-2-installation-failed-install_failed_)
   - [6.3 No ARM translation layer in the system image / ARM apps fail to install or crash on launch](#6-3-no-arm-translation-layer-in-the-system-image-arm-apps-fail-to-install-or-crash-on-launch)
   - [6.4 adb not authorized (allow USB debugging)](#6-4-adb-not-authorized-allow-usb-debugging)
   - [6.5 Double-clicking the icon does nothing / keeps spinning / a window with a rotate button appears](#6-5-double-clicking-the-icon-does-nothing-keeps-spinning-a-window-with-a-rotate-button-appears)
   - [6.6 Other startup problems — quick reference](#6-6-other-startup-problems-quick-reference)
   - [6.7 Apps have no sound / sound is very quiet](#6-7-apps-have-no-sound-sound-is-very-quiet)
   - [6.8 Store version fails to start / 0xC0000135 (DLL failed to load)](#6-8-store-version-fails-to-start-0xc0000135-dll-failed-to-load)
   - [6.9 Apps can't use the microphone / voice calls can't be recorded](#6-9-apps-can-t-use-the-microphone-voice-calls-can-t-be-recorded)
   - [6.10 Discrete / integrated GPU rendering (GPU preference)](#6-10-discrete-integrated-gpu-rendering-gpu-preference)
7. [Command-line reference](#7-command-line-reference)
8. [Data & folders](#8-data-folders)
9. [Getting help & feedback](#9-getting-help-feedback)

---

## 1. ApkStart in 30 seconds

```
Desktop icon (the real app icon, .lnk)
      │ Double-click
      ▼
ApkStart.exe --launch <package name>
      │ Android runtime not running? → Starts it automatically (Android 14 emulator, bundled or downloaded on first use)
      ▼
Opens the app at the launch entry the system resolves (not the main Activity hardcoded in the APK)
      ▼
Emulator window = app window (retitle, change icon, portrait ratio, fullscreen centered)
```

**What makes it different**

- 🖱️ **Double-click an .apk to install it**: once the file association is registered in File Explorer, double-clicking an APK → parses it automatically → installs it → creates a desktop icon.
- 🧩 **One desktop icon per app**: icons are extracted offline from inside the APK; double-clicking an icon goes straight into the app.
- 🪟 **An app is a window**: natively rendered, fullscreen fills the screen height and centers itself; windowed mode can be dragged and resized, and each app remembers its own size.
- 🔍 **Findable in Windows search**: shortcuts in both places — desktop + Start menu (`Programs\ApkStart\`).
- 📁 **Shared data**: `%USERPROFILE%\ApkStartShared` ↔ `/sdcard/ApkStartShared` inside Android, synced both ways.
- 🪶 **Built-in runtime**: doesn't depend on MuMu / LDPlayer / WSA or any other emulator installed on your machine.

> Note: this is an early version of the project, maintained by the author in their spare time — open source, free, and ad-free. Running into problems is normal; that's what this manual is for.

---

## 2. Installation & first launch

### 2.1 Choosing the right version for you

Both sources carry identical content; if you're in China, Gitee is recommended:

- GitHub: `github.com/RoutineMiku/apkstart/releases`
- Gitee: `gitee.com/daily-miku/apkstart/releases` (direct connection from China, much faster)

| Edition | File name | When to pick it |
|---|---|---|
| **Store version** | `ApkStart_<four-part version>_x64.msix` | Install from the Microsoft Store. Includes the full runtime, no network needed after install; updates are handled by the Store |
| **Full portable** | `ApkStart-v*-win64-full.zip` (about 830 MB, extracts to ~1.3 GB) | Don't want to install anything or wait for a download: extract and use, the runtime is all in the package |
| **Installer** | `ApkStart-v*-Setup.exe` (about 1.3 GB) | Want desktop / Start menu shortcuts and an uninstall entry |
| **Light portable** | `ApkStart-v*-win64-portable.zip` (96 MiB, extracts to ~227 MB) | Just want to try it first; the runtime downloads over the network on first launch |

> ⚠️ **Always use the latest version (currently 0.6.4)**. Older versions (0.5.x and earlier) either have no built-in runtime — hunting for or downloading a 1.5 GB runtime on every launch — or default to the embedded window. That is exactly where "very slow, won't open, and a window with a rotate button shows up" usually comes from. If you're upgrading from an older version, make sure your desktop icons point at the new program folder.

### 2.2 What happens on first launch

1. **(Light version only) Download the runtime**: adb, Android Emulator, and the Android 14 system image. The official source measures 10+ MB/s in practice, with 8-thread chunked downloads and resume support. The full / Store versions skip this step.
2. **First-time image extraction**: the xz image extracts to `%APPDATA%\apkstart\system-images` (about 20 seconds, done once).
3. **First-time `/data` creation**: ApkStart generates its own ext4 user data with encryption and SELinux labels (the official image only contains a 1 MB placeholder).
4. **Automatic boot**: after that, opening an app is just one `am start` — about 23 seconds for a cold boot, about 10 seconds when a snapshot hits.

> A slow first launch is normal — it's a one-time cost. After that, apps open in seconds.

---

## 3. Everyday use

### 3.1 Installing apps

Pick any of three ways:

- **Double-click the APK file** (first register the association: Settings → System integration → Associate .apk files);
- Choose "Install app" in the main window;
- Command line: `ApkStart.exe <path\to.apk>`.

Split packages (`.apks` / `.xapk`) are supported (installed automatically with `install-multiple`). Desktop and Start menu shortcuts are created automatically after install.

### 3.2 Opening apps

Double-click the desktop icon. All apps share one runtime, so **the second app starts almost instantly**.

### 3.3 Windows & display

| Action | How |
|---|---|
| Fullscreen / window toggle | `F11` or the tray menu (right-click). Fullscreen only enlarges the window — it doesn't change the picture's aspect ratio |
| Rotate landscape / portrait | `Ctrl+Alt+R` (global) or the rotate button in the title bar; the orientation is remembered per app |
| Auto full screen | Settings → Display & windows → Auto full screen (works best together with "Force orientation") |
| Force landscape / portrait | Settings → Display & windows → Screen orientation |

> The runtime only restarts (about 40 seconds, with a notice in the title bar) the one time the panel orientation and the app orientation disagree; apps in the same orientation after that open instantly.

### 3.4 Keyboard shortcuts

| Key | What it does |
|---|---|
| `F11` | Fullscreen / window mode toggle |
| `Ctrl+Alt+R` | Rotate the current app landscape / portrait |
| `Ctrl+R` | Rotate inside the shell window (in native window mode, use `Ctrl+Alt+R` instead) |

### 3.5 File sharing (Windows ↔ Android)

Your local `%USERPROFILE%\ApkStartShared` and `/sdcard/ApkStartShared` inside Android sync both ways within seconds.
Find it at: Settings → Integration & files → File sharing (with "Sync now" or "Open folder").

### 3.6 Settings navigation

Since 0.6.0 the settings are split into eight categories, with a search box at the top (type keywords like "landscape", "memory" or "proxy" — matches span categories):

| Category | Main contents |
|---|---|
| Common & install | Runtime & environment, One-click setup, Launch at startup, Disk usage & cleanup |
| Display & windows | Display mode, Auto full screen, Screen orientation, Tablet layout, Window hosting |
| Controls & input | Mouse buttons, Key mapping |
| Performance & resources | Resource profile, GPU preference (discrete / integrated), microphone, Quality, data partition, system language, snapshots, Prewarm on startup |
| Network & downloads | Update & download sources, acceleration mirrors, download threads |
| Diagnosis & repair | This PC checkup, drivers / compatibility patches, Auto-detect |
| Integration & files | Desktop & apps, File sharing, System integration |
| Updates & about | Software update, About |
| Lab | Native multi-window · run multiple apps on Windows (experimental), Apps kept in background |

> **Lab · run multiple apps (experimental)**: once enabled, opening a new app no longer forces the previous one to close — several apps can stay in the background and be switched back to at any time, keeping their logged-in state. Because the Android runtime has only one emulator window, only one app's screen is ever in the foreground at a time — this is not true side-by-side multi-window; enabling it also uses more memory. Off by default; ignore it if you want stability.

### 3.7 Online updates

Settings → Updates & about → Check for updates, or right-click the tray icon → Check for updates. The update channel tests the sources (GitHub / Gitee / mirrors) on the spot and picks the fastest, downloads in parallel chunks, and switches source automatically on failure. Updating never loses the runtime, installed apps, or snapshots.

The new portable build supports **incremental updates**: each release also ships an "incremental manifest" and a small package containing only the program code (a few MB, versus about 100 MB for the whole installer). If your Electron shell version hasn't changed, the update downloads just that small package, verifies it file by file, and replaces the program code — done in seconds. If the shell version changed, the manifest is missing, or any check fails, it falls back to downloading the full package automatically, so an update can never break the program. The Store version is still updated by the Microsoft Store.

> Note: incremental updates only apply if you installed the portable build via "Check for updates" from GitHub / Gitee; installs from the Microsoft Store use the Store channel. Incremental updates have no effect on installed apps, Android data, the runtime, or snapshots.

---

## 4. Three core concepts (the key to understanding errors)

Most "weird problems" trace back to one of the three things below. Spend a minute understanding them and the rest of the troubleshooting will go smoothly.

### 4.1 Runtime / system image

ApkStart doesn't emulate an "empty Android" — it loads a **complete Android 14 system image** as its base.
Since 0.6.3 there is just **one universal image** (Google Play x86_64), and both x86 and ARM apps run on it — no more two-image setup ("AOSP image / compatible image") like older versions.

- A missing / damaged image, or one incompatible with old user data → failed boot, stuck at boot, repeated restarts.
- User data (`/data`) is a thin differential layer; the system image is shared machine-wide as a single copy.

### 4.2 Hardware acceleration

For the emulator to run fast, it needs CPU virtualization acceleration. On Windows there are only two ways:

| Method | What it is | Needs admin for | Restart after install? |
|---|---|---|---|
| **WHPX** | Windows' built-in "Windows Hypervisor Platform" feature (HypervisorPlatform) | Enabling the feature | Yes |
| **AEHD** | Google's own kernel driver | Installing the driver | No |

**It still runs without acceleration** (pure software emulation, TCG) — just with a boot that takes minutes and frames that drop easily. That's "slow", not "failed to start". ApkStart falls back automatically, retrying with up to 4 sets of parameters in the order "render backend → acceleration method → memory / cold boot".

> Don't mistake **VirtualMachinePlatform** (the one WSL2 uses) for the acceleration switch. The emulator needs **HypervisorPlatform**. With only the former enabled, `emulator -accel-check` still reports it as unavailable.

### 4.3 ARM translation layer

The vast majority of Chinese Android apps ship only **ARM native libraries** (arm64-v8a / armeabi-v7a), while the system image is **x86_64** — so a "translation layer" is needed to translate ARM instructions for the x86 CPU. The 0.6.3 universal image has the new `ndk_translation` layer built in, so installing ARM apps usually needs no setup at all.

- The first time an ARM app shows up, if the translation-layer components aren't in place yet, ApkStart automatically fetches the compatible image and restarts the runtime to retry (see 6.3).
- The old image (API 30) had compatibility problems with the new translation layer (e.g. ByteDance apps triggering a `DoBadTrampoline` SIGABRT); the Android 14 image has fixed them.

---

## 5. Do this first when something goes wrong: checkup & auto-detect

Before paging through this manual, let the app check itself — it can fix most problems on its own.

### 5.1 This PC checkup · auto-config

Location: Settings → Diagnosis & repair → **Run checkup**

- What it checks: whether CPU virtualization (VT-x/SVM) is on, whether Hyper-V / Windows Hypervisor Platform is available, GPU / VRAM / drivers, memory, system version, `emulator -accel-check`, and the AEHD driver.
- Click "**Apply recommended settings**" to write the safe settings automatically: memory / core count / render resolution / Quality / force software emulation when there's no acceleration — and save them as a driver for this machine, applied automatically from then on.
- Results are graded: `ok` (fine) / `warn` (works but should be optimized) / `bad` (won't run until fixed). Each item has a color and an explanation.

Only two things need you to do them yourself:
- **BIOS virtualization**: restart into the BIOS → turn on Intel VT-x / AMD SVM → Enabled (the app can't do this step for you).
- **Windows features / acceleration driver**: see 6.1.

### 5.2 Auto-detect (automatic debugging)

Location: Settings → Diagnosis & repair → "Auto-detect · smart diagnosis"

In the background it checks the machine every 10 minutes and lists issues under six categories; each one can be fixed with one click (restart the runtime, clear locks, clear orphaned processes, invalidate snapshots, clean up disk, reset the Android network, …), and it re-checks automatically after fixing:

| Category | Issues covered |
|---|---|
| Runtime | The real reason the last start failed, boot stuck, leftover lock files, orphaned emulator processes, empty snapshot shells, no hardware acceleration |
| Device | adb not authorized, offline, runtime running but adb sees no device |
| Storage | Free disk space, data partition settings not matching reality, shared folder not writable |
| Settings | Screen orientation conflicting with the physical panel, Auto full screen not working in native window mode |
| Network / Logs | No network on the Android side, download source unreachable, recent errors in the logs |

> Two principles: a failed probe is never reported as an issue (if the state can't be read, it reports "unknown" — it never guesses); and the same old issue won't keep nagging you.

### 5.3 Export diagnostic report

Location: Settings → Diagnosis & repair → **Export diagnostic report** (or the button of the same name on the System integration page)

The report is plain text, containing the machine's configuration, the launch parameters chosen automatically, logs, and the diagnostic conclusions. Attach it when reporting a problem — it speeds up diagnosis a lot.

### 5.4 Built-in user manual & automatic tutorials

Since 0.6.3 this manual is built into the app: the "?" button in the main window's title bar, and "Open the user manual" in Settings → About, both open it directly. It's searchable, scrollable, and printable / saveable as PDF. When it opens, it jumps straight to the section related to the current problem.

Auto-detect / auto-fix also brings the tutorial to you:

- When auto-detect finds an issue, the issue entry has a "Tutorial" button on the right — click it to jump to the matching section;
- When auto-fix fails for hardware acceleration, installation failures, the ARM translation layer, adb authorization, no sound, and similar issues, the matching tutorial pops up automatically — no need to come here and look it up;
- The same tutorial only pops up once per run, so it won't keep interrupting you.

> To open it manually: the `?` button in the title bar. To temporarily turn off the automatic popups, disable notifications in the auto-detect settings — tutorials can still be opened from the "Tutorial" button on an issue entry.

---

## 6. Common problems & fixes

### 6.1 "Hardware acceleration not enabled" / slow boot

**Symptom**: Settings / Diagnosis reports "No hardware acceleration right now" or "Hardware acceleration unavailable"; boot takes minutes and frames drop.

**Be clear about this first**: this is usually "slow", not "won't open". ApkStart has already fallen back to software emulation automatically. Acceleration is only needed if you want it smooth.

**Handle it by version:**

- **Installer / portable**: Settings → Diagnosis & repair → This PC checkup → find "Hardware acceleration not enabled" → click **Fix**. A UAC prompt appears once and WHPX is enabled automatically; if that fails (unsupported system, or you clicked No), it switches to installing the AEHD driver instead.
- **Microsoft Store (MSIX) version**: Store apps **cannot elevate themselves**, so clicking "Fix" opens the "Turn Windows features on or off" dialog:
  1. Tick **"Windows Hypervisor Platform"** (HypervisorPlatform);
  2. Click OK, then **restart the computer** once.

  Or run this in an **administrator PowerShell**:

  ```powershell
  dism /online /enable-feature /featurename:HypervisorPlatform /all /norestart
  dism /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
  ```

> Two traps: ① don't enable only VirtualMachinePlatform — that isn't the acceleration the emulator needs; ② if VT-x/SVM isn't enabled in the BIOS, enable it there first (see 5.1) — otherwise the Windows feature does nothing.
> If a graphics driver is over 3 years old, update it from the vendor's website; ApkStart will not install drivers automatically (a wrong one is worse). Some old GPUs / integrated GPUs need a compatibility patch — see Settings → Diagnosis & repair → Drivers · compatibility patches.

---

### 6.2 Installation failed (INSTALL_FAILED_*)

**Symptom**: installing an app errors out; the message usually starts with "Installation failed:" and ends with an `INSTALL_*` error code.

ApkStart translates the raw English error into a readable message. Use the table below to handle it:

| Error code | Meaning | What to do |
|---|---|---|
| `INSTALL_FAILED_NO_MATCHING_ABIS` | The app only ships ARM libraries; the current image has no ARM translation layer | **Usually automatic**: ApkStart switches to the compatible image and retries. See [6.3](#6-3-no-arm-translation-layer-in-the-system-image-arm-apps-fail-to-install-or-crash-on-launch) |
| `INSTALL_FAILED_OLDER_SDK` | The app requires a newer Android version | Needs a newer system image; current is Android 14 (API 34), rarely triggered |
| `INSTALL_PARSE_FAILED_NO_CERTIFICATES` | The APK has no valid signature | The APK is damaged or unofficial — get the package again |
| `INSTALL_PARSE_FAILED_INCONSISTENT_CERTIFICATES` / `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | Signature doesn't match the installed version | Uninstall the old version first, then install |
| `INSTALL_FAILED_VERSION_DOWNGRADE` | A newer version is already installed on the device | Can't install over it with an older version — install a newer version or uninstall first |
| `INSTALL_FAILED_INSUFFICIENT_STORAGE` | Not enough disk space in the runtime | Free up disk space, or move the runtime data folder to a drive with room (Settings → System integration) |
| `INSTALL_FAILED_INVALID_APK` | APK damaged / incomplete | The download may not have finished — download it again |
| `INSTALL_FAILED_INVALID_URI` | APK path contains special characters / Chinese | Move the APK to a path with only English characters, then install |
| `INSTALL_FAILED_ALREADY_EXISTS` | Same name already exists with a different signature | Uninstall first |
| `INSTALL_FAILED_DEPRECATED_SDK_VERSION` | App targets a very old Android | **Automatic**: ApkStart retries with the official bypass parameter |
| `INSTALL_FAILED_TEST_ONLY` | Test-only package | **Automatic**: retries automatically with the test-package parameter |
| `INSTALL_FAILED_MISSING_SHARED_LIBRARY` | Depends on device features / vendor libraries that don't exist | The app depends on a specific vendor environment the emulator can't provide |
| `INSTALL_FAILED_USER_RESTRICTION` | System restricts installation | Restart the runtime and retry |
| `INSTALL_FAILED_CONFLICTING_PROVIDER` | Conflicts with an existing app's ContentProvider | Uninstall the conflicting app |
| `INSTALL_FAILED_INTERNAL_ERROR` | Internal system error (mostly low space or boot not finished) | Restart the runtime, wait for the boot to finish, then retry |

> If you get a raw English error that isn't in the table above, export a diagnostic report as in 5.3 and send it in with your feedback.

---

### 6.3 No ARM translation layer in the system image / ARM apps fail to install or crash on launch

**Symptom**: installing reports `INSTALL_FAILED_NO_MATCHING_ABIS` with a message like "This app only ships ARM native libraries… the current system image has no ARM translation layer"; or the app installs but crashes on launch, with `DoBadTrampoline`, `libndk_translation`, `UnsatisfiedLinkError`, or `...so not found` in the logs.

**How it works**: 0.6.3 uses **one universal Android 14 image** for both x86 and ARM, with the translation layer built in. Older versions needed a manual image switch; the "Universal compatible image (managed automatically)" switch now exists **only for compatibility with old configurations — normally you never need to touch it**.

**What ApkStart does automatically:**

1. If installation reports `NO_MATCHING_ABIS`, it switches to the compatible image automatically → restarts the runtime → reinstalls your installed apps from local APK backups → installs again (see the log line "switching to the compatible image and restarting the runtime…").
2. If an app crashes on launch and the logs clearly point at the ARM translation layer (e.g. `DoBadTrampoline`), it switches to the Android 14 compatible image automatically and retries (log line "ARM translator crash detected, switching to the compatible image…").

**What you need to do:**

- **Wait patiently**: switching images restarts the runtime, about 40 seconds to 1 minute each time, and you may see a notice window during it.
- **Check the image is in place**: Settings → Common & install → Runtime, and look at the "Universal compatible image (managed automatically)" status; if it shows not downloaded, click "Download compatible image" (about 1.5 GB), then **restart the runtime** for it to take effect.
- **Still crashing**: a few apps have deeper anti-emulator checks (forcing verification of real sensors, baseband, and so on) and can't run in an emulator; those apps show a plain-language explanation — that's a limitation, not a fault.

**What if you see a red "Installation failed" but the message still says "switching to the compatible image and retrying"?**

That's a display bug in an older version: the image file is on disk, but it was reused with an old runtime that has no translation layer, so the switch-and-retry was skipped and the failure was reported directly, while the message still said "retrying". **You're not on the latest code — please upgrade to the latest 0.6.4 build** (the version this manual covers has fixed it: before installing, it probes the current runtime's real translation ability instead of just checking whether the image file exists; `NO_MATCHING_ABIS` always triggers switch + restart + clear old snapshots + reinstall; and if it still fails a second time, it says so honestly instead of claiming it's "retrying"). Just install again after upgrading.

> Tested: Hongguo Free Short Dramas (com.phoenix.read, arm64-v8a-only) installs normally on the Android 14 image + new translation layer, opens the recommendation feed, and plays videos. The current runtime's `ro.product.cpu.abilist` = `x86_64,arm64-v8a` — the translation layer is active.

---

### 6.4 adb not authorized (allow USB debugging)

**Symptom**: Diagnosis reports "adb not authorized" or "Android debugging authorization incomplete", `adb devices` shows `unauthorized`, and apps never start.

**The right fix (in order):**

1. Check whether an emulator window is showing an **"Allow USB debugging?"** dialog — click **Allow** there, and tick **"Always allow from this computer"**, and it won't ask again.
2. If the window can't be clicked or never appears: Settings → Runtime → **Reset Android data / Clear Android data**, then retry (this clears installed apps; the APK files are all still there and reinstall automatically, and the system itself is unaffected).

> ⚠️ **Never delete `%USERPROFILE%\.android\adbkey`**. Testing shows that does the opposite of what you want: Android only writes a new public key when the `adb_keys` file doesn't exist; if you swap in a new private key, the old public key stored in the system still applies, the two don't match, and authorization will never succeed.

> Command-line checks: ApkStart's adb service runs on the dedicated port 5044 (completely separate from your own 5037):
> ```powershell
> $env:ANDROID_ADB_SERVER_PORT = 5044
> adb devices    # should show emulator-5554
> ```
> Don't manually `adb connect` to port 5555 — the Play image pops up "Allow USB debugging" over the app, which looks like the program is broken.

---

### 6.5 Double-clicking the icon does nothing / keeps spinning / a window with a rotate button appears

Almost all of these point at the launch entry or window handoff. Check in the order below.

**① Make sure you're on the new version**

- Check the start of the log at `%APPDATA%\ApkStart\logs\app.log`: it should say `start v0.6.4`. If it says `v0.5.x`, your desktop / Start menu icons point at the old version's folder.
- The old version (0.5.x) has no built-in runtime and defaults to the embedded window → "very slow + a shell window with a rotate button". Switch to 0.6.4 and point the shortcuts at the new `ApkStart.exe`.

**② Know how long a boot takes**

A cold boot of about 23–48 seconds, and about 50 seconds for a restart after an orientation change, are normal. Clicking the icon during that time looks like "nothing happens", but the boot is running in the background. **Don't click repeatedly**: repeated clicks let a second instance take over the emulator, and the first instance's exit cleanup may shut the emulator down too, causing a failure (0.6.3 added `owner.pid` protection, but waiting in the queue still looks like nothing is happening). Click once and wait for it to come up.

**③ The native window didn't take over → falls back to the embedded window with a rotate button**

If the log shows `attach failed` or `emu:0`, the window agent couldn't find the emulator window, so the app falls back to embedded mode (the shell window with a title bar and a rotate button that you're seeing).
- This is easy to trigger when launching from a directory junction / non-standard path; 0.6.3 made the agent resolve the real path before matching. If it still happens, report it with the log attached.

**④ Reset Android data (last resort)**

Settings → Common & install → **Reset Android data** (with a second confirmation). This clears installed apps and data but keeps the system itself; the app list is kept and apps reinstall automatically when opened. Use it for data partition corruption, `/data` failing to mount, and other failures to open.

---

### 6.6 Other startup problems — quick reference

ApkStart already handles most of these runtime errors automatically; the table below explains what it did and what else you can do. If the automatic handling doesn't work, export a diagnostic report as in 5.3.

| Diagnosis | Auto fix | What you can do |
|---|---|---|
| Hardware acceleration unavailable | Falls back to software emulation | Enable acceleration as in 6.1 |
| Memory allocation failed | Lowers memory and core count | Close memory-hungry programs |
| Emulator port in use | Switches to a free port automatically | Quit other emulators (Nox / MuMu / BlueStacks) or restart |
| Leftover lock file / "Running multiple emulators with the same AVD" | Clears the AVD lock and retries automatically | Make sure no other emulator is using the same runtime |
| System image missing / damaged / incompatible with old data | Boots again with clean user data | Settings → Runtime: delete the image and download it again |
| Quick-boot snapshot damaged | Discards the old snapshot and cold-boots | It rebuilds on the next clean exit; or turn snapshots off |
| Runtime components deleted / VC++ runtime missing | — | Add ApkStart to the antivirus allowlist and extract it again; install the Microsoft VC++ 2015-2022 runtime |
| Not enough disk space | — | Move the runtime folder to a drive with room; turn off snapshots / shrink the data partition |
| Path contains Chinese / special characters | Switches to a short path automatically | Move ApkStart to a folder with only English characters (e.g. `C:\ApkStart`) |
| CPU missing instruction sets (AVX/SSE4) | — | Usually just a warning and it still boots; otherwise switch to a machine with VT-x/AVX, or an older engine |
| The current runtime doesn't accept this GPU mode | Re-picks a working GPU mode for the engine version | — |
| Graphics card / unknown error | Retries with several parameter sets automatically | Update the graphics driver; or write a compatibility patch; if it still fails, export a diagnostic report |

**Desktop icons show as the ApkStart icon / blank icons**: Settings → System integration → **Rebuild shortcuts** (rewrites the desktop and Start menu shortcuts from the current app list, fixing the icons and taskbar identity along with them). Rebuild them too if a shortcut was moved and its path broke.

---

### 6.7 Apps have no sound / sound is very quiet

**Symptom**: videos and notification sounds in Android apps are completely silent; or other Windows software has sound and only the apps inside ApkStart are silent.

**First, tell the two apart**: if the system itself has no sound either, fix Windows audio first; only work through the steps below when it's just the apps inside ApkStart that are silent.

1. **Windows volume & output device**: click the volume icon in the taskbar and confirm nothing is muted, the volume isn't 0, and the output device is the headphones / speakers you're actually using. Open "Volume Mixer" and check whether the ApkStart / Android runtime row is muted on its own or pulled down to 0.
2. **In-app volume**: some apps set the media volume to 0 the first time they run — turn it up in the app's own settings or with the Android-side volume keys. Bilibili / Douyin and similar apps may also have autoplay sound switched off inside the app.
3. **ApkStart's audio switch**: Settings → Performance & resources → **Android audio** must be ticked. Auto-detect checks this item; if it finds it off, it reports it under "Settings → Diagnosis & repair" — click "**Fix**" to turn it on with one click. **You must restart the Android runtime after changing it** (the runtime only starts with `-no-audio` when both audio and microphone are off, so changing it while running won't produce sound right away).
4. **Windows audio service**: press `Win+R`, type `services.msc`, find **Windows Audio**, and confirm its status is "Running" and its startup type is "Automatic". If it's disabled, right-click to start it; 0.6.3's auto-detect also finds this and reports it. In an administrator PowerShell you can run `net start Audiosrv`.
5. **Bluetooth headphones / multiple output devices**: after switching to Bluetooth headphones, Windows sometimes doesn't move already-running programs over. Disconnect and reconnect the headphones, or restart the Android runtime once.
6. **Still no sound**: export a diagnostic report at "Settings → Diagnosis & repair → Export diagnostic report" and send it in with your feedback; the report includes the audio switch and audio service status, so it pinpoints whether the problem is configuration, a system service, or the app itself.

> When auto-fix fails, the app opens this section automatically. If you turned off auto-detect notifications, you can still get here from the "Tutorial" button on an auto-detect issue entry, or the `?` in the title bar.

---

### 6.8 Store version fails to start / 0xC0000135 (DLL failed to load)

**Symptom**: after opening an app it keeps spinning or quits outright, and the diagnostic report shows exit code `0xC0000135` (decimal `3221225781`). Most common with versions installed from the Microsoft Store.

**First, correct a common misreading**: `0xC0000135` only means "some DLL failed to load" — it does not necessarily mean the VC++ runtime is missing, and it does not necessarily mean the antivirus deleted a file. The same exit code has three possible causes; don't keep reinstalling for the first one only:

1. **Store (MSIX) version path limits**: the Store version installs into the read-only `C:\Program Files\WindowsApps\...` folder. When the Android runtime launches child processes like `qemu` from there, those processes look for DLLs by relative path, and the container's path redirection / environment isolation can break that — if a dependency isn't found, it exits with `0xC0000135`. This is specific to the Store version and can't be fixed by reinstalling VC++.
2. **The VC++ runtime really is missing**: the Android runtime (Qt6 / qemu) depends on Microsoft VC++ 2015-2022 (x64). If Settings → Diagnosis & repair explicitly reports "VC++ runtime (x64) missing", that means the DLL files were actually tested and found absent — click "**Fix**" to install it with one click.
3. **The antivirus quarantined runtime files**: DLLs in the runtime folder that were quarantined / deleted also produce this code. Add ApkStart's install folder and runtime data folder to the antivirus allowlist, then install again.

**Check in this order:**

1. **Check whether Diagnosis really reports missing VC++**: if Settings reports the "VC++ runtime (x64) missing" item, click its one-click fix. Restart the computer after installing, then try again. **Don't** reinstall just because the exit code is `0xC0000135` — confirm this item is actually reported first.
2. **No VC++ report, but it still fails → most likely the Store version path issue**: this is currently the most likely cause. Try in order:
   - Quit ApkStart completely (tray icon → Exit) and open it again;
   - Check the antivirus's "Controlled folder access / ransomware protection", add ApkStart to the allowlist, then restart;
   - If it still fails, use the **portable build** (`ApkStart-win64-portable` in the GitHub / Gitee repo's Releases) in a folder with only English characters (e.g. `C:\ApkStart`) — the portable build doesn't install under WindowsApps, so it sidesteps this limit directly.
3. **To find the exact failing DLL name (advanced)**: when reporting the problem, the most valuable thing you can tell the developers is which DLL is actually missing. In Event Viewer → Windows Logs → Application, look for an `Application Error` for ApkStart / emulator and check the `FaultingModuleName` field; or export a diagnostic report at "Settings → Diagnosis & repair → Export diagnostic report" and send it along with your feedback.
4. **What if adb crashes too**: if the event log also has `adb.exe` reporting `0xC0000409`, that's a separate, independent issue (a device-connection anomaly), not the direct cause of the emulator exiting — handle the startup first with steps 1–3 above, and describe the adb issue separately in your feedback.

> This section pops up automatically: when a start failure / fix failure is judged to be a DLL-type problem, the app opens straight here. You can also get here any time from the "Tutorial" button on an auto-detect entry, or the `?` in the title bar.

---

### 6.9 Apps can't use the microphone / voice calls can't be recorded

**Symptom**: voice messages, calls, recording, voice input in scan, and similar features fail in apps, with a message like "No microphone / recording device unavailable".

1. **ApkStart's microphone switch**: Settings → Performance & resources → **Microphone input** must be ticked. It's on by default; if it's off, auto-detect reports "Microphone input is turned off in Settings" under "Settings → Diagnosis & repair" — click "**Fix**" to turn it on with one click and restart the runtime. **You must restart the Android runtime after changing it** (the switch decides whether the emulator exposes a recording device to Android).
2. **Windows microphone permissions**: `Settings → Privacy & security → Microphone` — confirm both "Let apps access your microphone" and "Let desktop apps access your microphone" are on. Android runs inside a desktop app, so if this is off, the system can't get the microphone at all.
3. **Confirm Windows can record**: record a clip with the built-in "Voice Recorder" and confirm the microphone and input device (headset mic / camera mic / standalone mic) work and aren't muted.
4. **Pick the right input device**: if several microphones are plugged in, set the one you want as the default in Windows "Sound settings → Input" — the emulator uses the system default input device.
5. **How audio and microphone relate**: the emulator only shuts the audio subsystem down completely to save CPU when **both** "Android audio" and "Microphone input" are off; as long as one is on, the other works normally.

> When the microphone is off, the app side just "can't find a recording device" — there's no obvious error. Auto-detect takes responsibility for reporting this to you; you can also open this section manually from the `?` in the title bar.

---

### 6.10 Discrete / integrated GPU rendering (GPU preference)

**Symptom**: the computer clearly has a discrete GPU, but app screens stutter and drop frames; or a laptop runs hot and drains battery, and you want to use the integrated GPU to save power.

ApkStart renders the Android screen with `-gpu host`, using hardware rendering that really calls on the computer's GPU. Since 0.6.4, all GPUs (NVIDIA / AMD / Intel) default to host first — unlike older versions, which demoted AMD / Intel to software rendering across the board, effectively giving up on the GPU. If host crashes on this machine, it falls back to the software backend automatically, so nothing breaks.

**Choosing which GPU to use**: when a computer has both a discrete and an integrated GPU, Windows sometimes assigns the emulator to the integrated one. Settings → Performance & resources → **GPU preference** lets you specify:

| Option | When to use it |
|---|---|
| System default (recommended) | Lets Windows choose by power / load — the least hassle on most machines |
| Discrete GPU first | Games, video, high frame rates; uses more power and runs hotter |
| Integrated GPU first | Light apps, idle / background use, saving laptop battery; weaker performance |

- This takes effect on the emulator process through Windows' "Graphics performance preference" (UserGpuPreferences); it only works on **Windows 10 1803 and above** — older systems ignore it automatically and it doesn't affect startup.
- It takes effect the **next time the Android runtime starts**; the settings page shows whether it's currently in effect.
- host occasionally crashes on old AMD drivers: update the graphics driver; if that doesn't help, enable the built-in AMD integrated GPU swangle sample patch at "Settings → Diagnosis & repair → Drivers · compatibility patches" to pin rendering to a more stable backend.

---

## 7. Command-line reference

```
ApkStart.exe                          Open the main window
ApkStart.exe <path\to.apk>            Install an APK
ApkStart.exe --launch <package name>  Launch an app directly (this is what desktop shortcuts use)
```

---

## 8. Data & folders

| What | Location |
|---|---|
| Runtime (adb / emulator / images) | Built into the package, or `%APPDATA%\apkstart\runtime` (light version) |
| Extracted system images | `%APPDATA%\apkstart\system-images` |
| AVD / installed apps / snapshots | `%APPDATA%\apkstart\avd` |
| App icons | `%APPDATA%\apkstart\icons\<package name>.ico` |
| Settings & app list | `%APPDATA%\ApkStart\settings.json` / `apps.json` |
| Run logs / diagnostic reports | `%APPDATA%\ApkStart\logs\` |
| Windows ↔ Android shared folder | `%USERPROFILE%\ApkStartShared` ↔ `/sdcard/ApkStartShared` |

> "Reset Android data" only clears the user data layer; the system image and APK files are kept. Updating the app never loses the runtime, installed apps, or snapshots.
>
> Keep plenty of free space on the C: drive: extracted images + data partition + snapshots can add up to several GB. Low space can cause installation / boot failures.

---

## 9. Getting help & feedback

When reporting a problem, please attach these three things — they speed up diagnosis a lot:

1. **Diagnostic report**: Settings → Diagnosis & repair → Export diagnostic report;
2. **The last 20 lines of app.log**: `%APPDATA%\ApkStart\logs\app.log`;
3. **Your version and edition**: e.g. "Store version 0.6.4" or "Full portable 0.6.4".

- GitHub: <https://github.com/RoutineMiku/apkstart> (Issues / Releases)
- Gitee: <https://gitee.com/daily-miku/apkstart>

---

*This manual covers v0.6.4 and is updated with each version. If the wording in the app differs slightly from here, what the app shows is authoritative.*
