'use strict';
/**
 * Automatic检测 (Automatic debug)内核
 *
 * 分两层，刻意分开: 
 *   1) 采集层 (src/core/autodebug-probe.js，主进程): 把机器真实状态采成一份纯数据快照 obs; 
 *   2) 判定层 (本文件，纯函数): evaluate(obs) → issues[]。
 *
 * 判定层不碰 fs / child_process / electron，CI 可以直接 require 并单测
 *  (教训见记忆 2026-11-17: CI 上 require 顶层依赖 electron 的模块会全红)。
 * 唯一额外依赖是同目录的 manual.js (纯映射表)，用来把问题直接指到内置Tutorial章节。
 *
 * 一条铁律: obs 里没有的字段一律当作「不知道」，不能因为Probe失败就报问题。
 * 误报比漏报更伤用户信任 —— 用户一旦发现弹出来的「检测结果」是假的，
 * 就再也不会相信Automatic检测给出的任何结论了。
 */

const manual = require('./manual');

/** 问题分类 (Settings页按这个顺序分组展示) */
const CATEGORIES = [
  { id: 'runtime', name: 'Runtime', hint: 'Android VM process, boot phase, snapshots and leftover locks' },
  { id: 'device', name: 'Device', hint: 'adb authorization status, whether the device is online' },
  { id: 'storage', name: 'Storage', hint: 'Free disk space, data partition, shared folder' },
  { id: 'settings', name: 'Settings', hint: 'Conflicts between settings that cancel each other out' },
  { id: 'network', name: 'Network', hint: 'Android network and download source connectivity' },
  { id: 'logs', name: 'logs', hint: 'Errors in the run logs' },
];

const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

/** 严重度排序: 数字越Large越严重 */
const SEVERITY_RANK = { error: 3, warn: 2, info: 1 };

/** 归一化一条问题，保证 UI 拿到的字段永远齐全 */
function normalise(raw) {
  if (!raw || !raw.code) return null;
  const severity = SEVERITY_RANK[raw.severity] ? raw.severity : 'info';
  const item = {
    code: String(raw.code),
    category: CATEGORY_IDS.includes(raw.category) ? raw.category : 'runtime',
    severity,
    title: String(raw.title || raw.code),
    hint: String(raw.hint || ''),
    // fix 是「一键Fix」的动作名，由渲染层映射到具体操作; 没有就留空
    fix: raw.fix || '',
    // detail 是给人看的补充信息 (路径, 数值等)，不进标题
    detail: raw.detail === undefined || raw.detail === null ? '' : String(raw.detail),
  };
  // 0.6.2: 每条问题都自带「Tutorial」目标，渲染层不用再复制一份故障分类表
  item.help = manual.topicForIssue(item);
  return item;
}

/**
 * 判定: 把观测快照变成问题列表
 * @param {object} obs 采集层给出的快照 (字段可缺省)
 * @returns {Array<object>} 归一化后的问题列表
 */
function evaluate(obs) {
  const o = obs || {};
  const runtime = o.runtime || {};
  const device = o.device || {};
  const storage = o.storage || {};
  const settings = o.settings || {};
  const network = o.network || {};
  const logs = o.logs || {};
  const accel = o.accel || {};
  const out = [];

  const push = (raw) => {
    const it = normalise(raw);
    if (it) out.push(it);
  };

  /* ---------------- Runtime ---------------- */

  // 开机失败: 直接给最后一条真实原因，别让用户猜
  const bootError = runtime.error || (runtime.lastFailure && runtime.lastFailure.error) || '';
  if (bootError) {
    push({
      code: 'runtime.bootFailed',
      category: 'runtime',
      severity: 'error',
      title: 'The Android runtime failed to start last time',
      hint: 'The runtime’s real error has been captured; fixing this cause usually restores it in one go.',
      detail: bootError,
      fix: 'restartRuntime',
    });
  }

  // 一直卡在Booting: 超过阈值还没 ready，多半是快照坏了或镜像有问题
  if (runtime.running && runtime.phase && runtime.phase !== 'ready' && runtime.bootMs > 150000) {
    push({
      code: 'runtime.stuckBoot',
      category: 'runtime',
      severity: 'warn',
      title: 'Android boot is stuck in the boot phase',
      hint: 'It has been booting for over 2½ minutes without reaching the system. The usual cause is a corrupt quick-boot snapshot; restarting the runtime (which does one cold boot) usually fixes it.',
      detail: `Phase: ${runtime.phase}`,
      fix: 'restartRuntime',
    });
  }

  // 残留锁文件: 会让下次启动被判成「AVD 已被占用」直接 FATAL
  if (Number(runtime.locks) > 0) {
    push({
      code: 'runtime.staleLocks',
      category: 'runtime',
      severity: 'warn',
      title: `Found ${runtime.locks} lock files left over from last time`,
      hint: 'If the lock files are not cleared, the next start will fail outright as “AVD already in use”. You can clear them in one click.',
      fix: 'lock',
    });
  }

  // 孤儿进程: emulator.exe 只是启动器，qemu 是 detached 的独立进程，
  // 只杀启动器会留下孤儿占着 multiinstance.lock (记忆 2026-11-13)。
  if (Number(runtime.orphans) > 0) {
    push({
      code: 'runtime.orphanProcesses',
      category: 'runtime',
      severity: 'warn',
      title: `${runtime.orphans} orphaned emulator processes`,
      hint: 'Android processes from the last unclean shutdown are still holding resources and the AVD lock, so the next boot will fail. You can clean them up in one click (installed apps and saves are untouched).',
      fix: 'orphans',
    });
  }

  // 快照空壳: 文件在但校验不过，每次开机都要「加载失败再cold boot」，等于白留了几 GB
  if (runtime.snapshotStale) {
    push({
      code: 'runtime.staleSnapshot',
      category: 'runtime',
      severity: 'warn',
      title: 'Quick-boot snapshot is corrupt',
      hint: 'The snapshot file is still there but fails verification, so every boot needs an extra cold boot. Deleting it trades one cold boot for disk space back.',
      fix: 'snapshots',
    });
  }

  /* ---------------- Device ---------------- */

  // unauthorized: 安卓弹了「允许 USB 调试吗」但没人点 (记忆 2026-11-17 的老坑)
  if (device.state === 'unauthorized') {
    push({
      code: 'device.unauthorized',
      category: 'device',
      severity: 'error',
      title: 'Android device is not authorized for debugging',
      hint: 'Android showed the “Allow USB debugging?” prompt but it was never confirmed, so adb cannot connect. Restarting the runtime (one cold boot) shows the prompt again; confirm it and it recovers.',
      fix: 'restartRuntime',
    });
  } else if (device.state === 'offline') {
    push({
      code: 'device.offline',
      category: 'device',
      severity: 'warn',
      title: 'Android device is offline',
      hint: 'adb can see the device but cannot connect, usually because the VM is still booting or the adb service has not finished handshaking. Wait a while; if it still does not recover, restart the runtime.',
      fix: 'restartRuntime',
    });
  } else if (runtime.running && device.checked && device.state === 'no-device') {
    push({
      code: 'device.missing',
      category: 'device',
      severity: 'warn',
      title: 'The runtime is running, but adb sees no device',
      hint: 'The Android process is alive but adb sees no device, most likely because another program is using the adb service port, or booting has not finished yet.',
      fix: 'restartRuntime',
    });
  }

  /* ---------------- Storage ---------------- */

  const freeMB = Number(storage.freeMB) || 0;
  if (freeMB > 0 && freeMB < 2048) {
    push({
      code: 'storage.diskCritical',
      category: 'storage',
      severity: 'error',
      title: 'The disk holding the runtime is almost full',
      hint: 'Less than 2 GB left; installing apps and writing snapshots will fail. Use “One-click cleanup” to reclaim old images, old snapshots and logs.',
      detail: `${freeMB} MB left`,
      fix: 'disk',
    });
  } else if (freeMB > 0 && freeMB < 8192) {
    push({
      code: 'storage.diskLow',
      category: 'storage',
      severity: 'warn',
      title: 'The disk holding the runtime is getting tight',
      hint: 'Less than 8 GB left, and snapshots and system images still need space. Clean up the reclaimable files first.',
      detail: `${freeMB} MB left`,
      fix: 'disk',
    });
  }

  // 数据分区实际容量比配置Small → 装的游戏会提示「Storage空间不足」
  if (storage.needsReset) {
    push({
      code: 'storage.dataNeedsReset',
      category: 'storage',
      severity: 'warn',
      title: 'The data partition resize did not actually take effect',
      hint: 'The quick-boot differencing disk blocks an in-place resize, so the guest still sees the old size. Use “Reset Android data” to rebuild it at the new size (installed apps will be wiped).',
      detail: `Configured ${storage.configuredGB} GB · actual ${storage.actualGB} GB`,
      fix: 'dataReset',
    });
  } else if (Number(storage.configuredGB) > 0 && Number(storage.actualGB) > 0
    && Number(storage.configuredGB) > Number(storage.actualGB)) {
    push({
      code: 'storage.dataMismatch',
      category: 'storage',
      severity: 'error',
      title: 'The Android data partition is smaller than configured',
      hint: 'The usable capacity inside Android is smaller than the value in Settings, so installing a large game will report not enough storage.',
      detail: `Configured ${storage.configuredGB} GB · actual ${storage.actualGB} GB`,
      fix: 'dataReset',
    });
  }

  if (storage.sharedOk === false) {
    push({
      code: 'storage.sharedBroken',
      category: 'storage',
      severity: 'warn',
      title: 'Shared folder unavailable',
      hint: 'The host folder used for file sharing does not exist or is not writable, so files saved in Android do not sync over.',
      detail: storage.sharedPath || '',
      fix: 'shared',
    });
  }

  /* ---------------- Settings ---------------- */

  // 方向策略与物理面板打架 → 安卓只给App中间一条窄画面 (记忆 2026-11-18 的老坑)
  const mode = String(settings.orientationMode || 'auto');
  if (mode === 'portrait' && settings.landscape === true) {
    push({
      code: 'settings.orientationConflict',
      category: 'settings',
      severity: 'warn',
      title: 'The screen orientation policy is opposite to the current panel orientation',
      hint: 'The policy wants portrait, but the panel is landscape, so Android only gives apps a narrow strip with black bars on both sides. Change the panel orientation to match the policy.',
      fix: 'orientation',
    });
  } else if (mode === 'landscape' && settings.landscape === false) {
    push({
      code: 'settings.orientationConflict',
      category: 'settings',
      severity: 'warn',
      title: 'The screen orientation policy is opposite to the current panel orientation',
      hint: 'The policy wants landscape, but the panel is portrait, so videos and games get a narrow vertical strip. Change the panel orientation to match the policy.',
      fix: 'orientation',
    });
  }

  if (settings.windowEmbed === false && settings.autoFullscreen) {
    push({
      code: 'settings.detachedFullscreen',
      category: 'settings',
      severity: 'info',
      title: '“Auto full screen on start” has no effect in Native window mode',
      hint: 'In Native window mode the emulator opens its own window and decides full screen itself; this switch does not control it. To fill the screen, press F11 inside the window, or change the window hosting to Embedded mode.',
    });
  }

  if (settings.keepSnapshot === false && freeMB > 0 && freeMB < 4096) {
    push({
      code: 'settings.snapshotOffLowDisk',
      category: 'settings',
      severity: 'info',
      title: 'Disk is tight, and the quick-boot snapshot is off',
      hint: 'Less than 4 GB of disk space left and the snapshot is off, so opening an app does a full cold boot (a dozen seconds or so). If you have enough disk, turn the snapshot back on.',
      fix: 'settings',
    });
  }

  /* ---------------- 声音 ---------------- */

  // 0.6.2 新增: use户反馈「有的App没声音」时，第一反应往往是系统音量问题，
  // 实际上最常见是Engine开关被关掉 (-no-audio)或 Windows Audio 服务被停了。
  const audio = o.audio || {};
  if (audio.checked && audio.enabled === false) {
    push({
      code: 'audio.disabled',
      category: 'settings',
      severity: 'warn',
      title: 'Android app audio is turned off in Settings',
      hint: 'The Android audio switch is off, so only the apps inside ApkStart are silent. Click “Fix” to turn it back on, then restart the runtime once.',
      fix: 'audio',
    });
  }
  if (audio.checked && audio.serviceRunning === false) {
    push({
      code: 'audio.windowsServiceStopped',
      category: 'settings',
      severity: 'warn',
      title: 'Windows Audio service (Audiosrv) is not running',
      hint: 'This silences other software on the system too. Start Windows Audio in services.msc and set it to Automatic, or run net start Audiosrv in an administrator PowerShell.',
      fix: 'audioService',
    });
  }
  // 麦克风输入被关掉: 语音/通话/录音类App会拿不到录音设备。
  // 只在明确关掉时才提示 (micEnabled===false)，Probe不到不报，避免误报。
  if (audio.checked && audio.micEnabled === false) {
    push({
      code: 'audio.microphoneDisabled',
      category: 'settings',
      severity: 'warn',
      title: 'Microphone input is turned off in Settings',
      hint: 'Voice, calls and recording in apps will fail (no recording device is found). Click “Fix” to turn it back on and restart the runtime once; also check that the Windows microphone permission allows desktop apps.',
      fix: 'microphone',
    });
  }

  /* ---------------- Network ---------------- */

  if (network.ok === false) {
    push({
      code: 'network.guestDown',
      category: 'network',
      severity: 'warn',
      title: 'No network inside Android',
      hint: 'Android-side DNS or connectivity is failing, so video and news apps will keep spinning. Use “Repair network” to reset the Android data (the app list is kept).',
      detail: network.reason || '',
      fix: 'repairNetwork',
    });
  }

  const badSources = Array.isArray(network.sources) ? network.sources.filter((s) => s && s.ok === false) : [];
  if (badSources.length) {
    push({
      code: 'network.sourcesDown',
      category: 'network',
      severity: 'warn',
      title: `${badSources.length} download source(s) unreachable`,
      hint: 'Update checks ask several sources at once; one unreachable source does not affect use. If none of them work, check your network or proxy.',
      detail: badSources.map((s) => s.name).join(', '),
      fix: 'settings',
    });
  }

  /* ---------------- logs ---------------- */

  const errLines = Array.isArray(logs.errors) ? logs.errors.filter(Boolean) : [];
  if (errLines.length) {
    push({
      code: 'logs.errors',
      category: 'logs',
      severity: 'warn',
      title: `${errLines.length} error(s) in the run logs`,
      hint: 'The last run left error records; open the diagnostic report to see the full context.',
      detail: errLines.slice(-1)[0],
      fix: 'report',
    });
  }

  /* ---------------- 加速 ---------------- */

  if (accel.checked && accel.ok === false) {
    push({
      code: 'accel.softwareEmulation',
      category: 'runtime',
      severity: 'warn',
      title: 'No hardware acceleration right now',
      hint: 'Only pure software emulation is available, so boot takes minutes and frames drop easily. Enable “Windows Hypervisor Platform” and restart.',
      detail: accel.note || '',
      fix: 'virtualization',
    });
  }

  return dedupe(out);
}

/** 同 code 只留最后一条 (后一次检测覆盖前一次) */
function dedupe(issues) {
  const map = new Map();
  for (const raw of issues || []) {
    const it = normalise(raw);
    if (!it) continue;
    map.set(it.code, it);
  }
  return Array.from(map.values());
}

/** 按严重度从高到低排 */
function bySeverity(a, b) {
  const d = (SEVERITY_RANK[b.severity] || 0) - (SEVERITY_RANK[a.severity] || 0);
  if (d) return d;
  return String(a.code).localeCompare(String(b.code));
}

/** 汇总: 给状态条计数, 给Settings页分栏 */
function summarize(issues) {
  const list = dedupe(issues).sort(bySeverity);
  const errors = list.filter((i) => i.severity === 'error').length;
  const warns = list.filter((i) => i.severity === 'warn').length;
  const infos = list.filter((i) => i.severity === 'info').length;
  const byCategory = CATEGORIES.map((c) => {
    const items = list.filter((i) => i.category === c.id);
    return {
      id: c.id,
      name: c.name,
      count: items.length,
      errors: items.filter((i) => i.severity === 'error').length,
    };
  });
  return {
    total: list.length,
    errors,
    warns,
    infos,
    byCategory,
    // 一眼能看出「有没有必须马上Fix的问题」
    health: errors ? 'error' : (warns ? 'warn' : (infos ? 'info' : 'ok')),
  };
}

/** 按分类分组，用于Settings页分类渲染 */
function groupByCategory(issues) {
  const list = dedupe(issues).sort(bySeverity);
  return CATEGORIES.map((c) => ({
    ...c,
    items: list.filter((i) => i.category === c.id),
  })).filter((g) => g.items.length);
}

/**
 * 对比两次检测结果: 找出「新出现」和「已消失」的问题。
 * Automatic检测只在新问题出现时提醒用户，已消失的只做静默记账 ——
 * 每次都弹「已恢复 3 项」会变成噪音。
 */
function diff(prevIssues, nextIssues) {
  const prev = new Map((prevIssues || []).map((i) => [i.code, i]));
  const next = new Map((nextIssues || []).map((i) => [i.code, i]));
  const added = [];
  const resolved = [];
  for (const [code, it] of next) {
    const before = prev.get(code);
    if (!before || before.severity !== it.severity) added.push(it);
  }
  for (const [code, it] of prev) {
    if (!next.has(code)) resolved.push(it);
  }
  return { added, resolved };
}

module.exports = {
  CATEGORIES,
  CATEGORY_IDS,
  SEVERITY_RANK,
  normalise,
  evaluate,
  dedupe,
  summarize,
  groupByCategory,
  diff,
  bySeverity,
};
