import { App, Plugin, PluginSettingTab, Setting, SettingDefinitionItem, TextComponent, getLanguage as getObsidianLanguage, setIcon } from "obsidian";

// Electron interfaces
interface ElectronWindow extends Window {
  require?: <T = unknown>(module: string) => T;
}

interface ElectronRemote {
  getCurrentWindow(): ElectronBrowserWindow;
  BrowserWindow?: {
    getAllWindows(): ElectronBrowserWindow[];
  };
}

interface ElectronBrowserWindow {
  isMinimized(): boolean;
  restore(): void;
  isVisible(): boolean;
  show(): void;
  isFocused(): boolean;
  isAlwaysOnTop(): boolean;
  setAlwaysOnTop(flag: boolean): void;
  focus(): void;
}

// --- i18n ---

type TranslationKey =
  | "introTitle" | "introDesc"
  | "enabled" | "enabledDesc"
  | "language" | "languageDesc" | "auto" | "chinese" | "english"
  | "keywords" | "keywordsDesc" | "keywordsPlaceholder"
  | "watchScope" | "watchScopeDesc"
  | "scopeModal" | "scopeNotice" | "scopeBoth" | "scopeCustom"
  | "customSelector" | "customSelectorDesc" | "selectorInvalid"
  | "focusInterval" | "focusIntervalDesc" | "secondsInvalid"
  | "quietHours" | "quietHoursDesc" | "quietRange" | "quietStart" | "quietEnd" | "quietUnset" | "quietSame"
  | "debugMode" | "debugModeDesc"
  | "guide" | "guideKeywords" | "guideScope" | "guideQuiet" | "guideExamples"
  | "guideEx1" | "guideEx2" | "guideEx3" | "guideTip";

type TranslationRecord = Record<TranslationKey, string>;

const translations: { en: TranslationRecord; zh: TranslationRecord } = {
  en: {
    introTitle: "Works out of the box",
    introDesc: "A dialog or notification that appears while Obsidian is in the background brings the window to the front.",
    enabled: "Enabled", enabledDesc: "Turn the raising off without losing your settings.",
    language: "Plugin language", languageDesc: "Change the language of these settings.", auto: "Follow Obsidian", chinese: "中文", english: "English",
    keywords: "Keywords (optional)",
    keywordsDesc: "Empty = any pop-up. Separate words with commas or new lines.",
    keywordsPlaceholder: "Snooze, done",
    watchScope: "Watch for", watchScopeDesc: "Which kind of pop-up to react to",
    scopeModal: "Dialogs", scopeNotice: "Notifications", scopeBoth: "Dialogs & notifications", scopeCustom: "Custom selector",
    customSelector: "Selector", customSelectorDesc: "Advanced: match any element you name. Empty = dialogs and notifications.",
    selectorInvalid: "That selector doesn't parse, so it isn't used.",
    focusInterval: "Cooldown (seconds)", focusIntervalDesc: "Shortest wait between two raises. 0 = no wait.",
    secondsInvalid: "Enter a whole number of seconds, 0 or more.",
    quietHours: "Quiet hours", quietHoursDesc: "No raising during these hours. Pop-ups still appear.",
    quietRange: "Time range", quietStart: "From", quietEnd: "To",
    quietUnset: "Both times are needed. Quiet hours stay off until they are set.",
    quietSame: "Start and end are the same time, so nothing is silenced.",
    debugMode: "Debug mode", debugModeDesc: "Record what was detected in the developer console (Ctrl+Shift+I).",
    guide: "Quick start guide",
    guideKeywords: "With no keywords, Obsidian comes forward whenever a dialog or notification appears while it is in the background. Add keywords to narrow that down.",
    guideScope: "\"Dialogs\" are the windows that block the page, \"Notifications\" are the small messages in the corner. \"Custom selector\" is for advanced matching.",
    guideQuiet: "During quiet hours nothing is hidden: pop-ups still appear inside Obsidian, the window simply stays where it is. Ranges may cross midnight, such as 22:00 to 08:00.",
    guideExamples: "Examples",
    guideEx1: "Reminder dialogs → keywords \"snooze, done\", watch for \"Dialogs\"",
    guideEx2: "Sync errors → keywords \"error, failed\", watch for \"Notifications\"",
    guideEx3: "Everything → leave keywords empty, watch for \"Dialogs & notifications\" (default)",
    guideTip: "To find a selector: open the developer console (Ctrl+Shift+I), pick the inspect tool, click the element, and read its class name.",
  },
  zh: {
    introTitle: "开箱即用",
    introDesc: "Obsidian 在后台时出现弹窗或通知，就把窗口带到最前面。",
    enabled: "已启用", enabledDesc: "关掉后不再置顶，设置会保留。",
    language: "插件语言", languageDesc: "更改这些设置项的显示语言。", auto: "跟随 Obsidian", chinese: "中文", english: "English",
    keywords: "关键词（可选）",
    keywordsDesc: "留空 = 任何弹窗都置顶；用逗号或换行分隔词语，只匹配包含它们的弹窗。",
    keywordsPlaceholder: "暂缓，完成",
    watchScope: "监听对象", watchScopeDesc: "对哪类弹窗做出反应",
    scopeModal: "弹窗", scopeNotice: "通知", scopeBoth: "弹窗和通知", scopeCustom: "自定义选择器",
    customSelector: "选择器", customSelectorDesc: "高级用法：匹配你指定的任意元素。留空 = 弹窗和通知。",
    selectorInvalid: "这个选择器无法解析，不会生效。",
    focusInterval: "冷却时间（秒）", focusIntervalDesc: "两次置顶之间的最短间隔。0 = 不限制。",
    secondsInvalid: "请输入 0 或更大的整数秒。",
    quietHours: "静默时段", quietHoursDesc: "这段时间内不置顶窗口，弹窗照常出现。",
    quietRange: "起止时间", quietStart: "开始", quietEnd: "结束",
    quietUnset: "两个时间都要填，静默时段才会生效。",
    quietSame: "开始与结束相同，不会静默。",
    debugMode: "调试模式", debugModeDesc: "在开发者控制台（Ctrl+Shift+I）记录检测到的内容。",
    guide: "入门指南",
    guideKeywords: "不设关键词时，只要 Obsidian 在后台弹出窗口或通知，就会置顶。填入关键词可以缩小范围。",
    guideScope: "「弹窗」指挡住页面的对话框，「通知」指角落里的小消息条。需要更灵活的匹配请选「自定义选择器」。",
    guideQuiet: "静默时段内不会隐藏任何内容：弹窗和通知照常出现，只是窗口不再跳到最前面。时段可以跨午夜，例如 22:00 到 08:00。",
    guideExamples: "配置示例",
    guideEx1: "提醒对话框 → 关键词「snooze, done」，监听「弹窗」",
    guideEx2: "同步报错 → 关键词「error, failed」，监听「通知」",
    guideEx3: "全部 → 关键词留空，监听「弹窗和通知」（默认）",
    guideTip: "查找选择器：打开开发者控制台（Ctrl+Shift+I），用检查工具点击目标元素，读取它的 class 名称。",
  },
};

// --- Settings ---

interface BringToFrontSettings {
  enabled: boolean;
  keywords: string;
  watchScope: "modal" | "notice" | "both" | "custom";
  customSelector: string;
  focusInterval: number;
  quietHoursEnabled: boolean;
  quietStart: string;
  quietEnd: string;
  language: "auto" | "zh" | "en";
  debugMode: boolean;
}

const SCOPE_SELECTORS: Record<string, string> = {
  modal: ".modal-container",
  notice: ".notice",
  both: ".modal-container, .notice",
};

// How long to keep watching a matched element whose text isn't set yet.
// Bounds resource use while covering async modal content / deferred Notice.setMessage.
const DEFERRED_TEXT_WINDOW_MS = 3000;

const DEFAULT_SETTINGS: BringToFrontSettings = {
  enabled: true,
  keywords: "",
  watchScope: "both",
  customSelector: "",
  focusInterval: 5,
  quietHoursEnabled: false,
  quietStart: "22:00",
  quietEnd: "08:00",
  language: "auto",
  debugMode: false,
};

// --- Quiet hours ---

// "HH:MM" → minutes since midnight, or null when unparseable. An empty input
// (the user cleared the time field) lands here and disables quiet hours rather
// than silencing indefinitely — missing a bring-to-front is recoverable,
// silencing forever looks like the plugin is broken.
function parseTimeToMinutes(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

// Half-open interval [start, end), so adjacent ranges (22:00–08:00 followed by
// 08:00–22:00) neither overlap nor drop a minute. start > end spans midnight.
// Takes the clock reading as an argument so the boundary rules stay checkable.
export function isWithinRange(nowMin: number, startMin: number, endMin: number): boolean {
  if (startMin === endMin) return false;
  if (startMin < endMin) return nowMin >= startMin && nowMin < endMin;
  return nowMin >= startMin || nowMin < endMin;
}

// --- Selector validation ---

// An unparseable selector is not merely useless — every querySelector call in
// checkNode/checkExisting swallows the SyntaxError, so the plugin would go
// quietly deaf. Both doors are shut: the settings page refuses to store one,
// and getSelector refuses to use one. Probing a detached fragment rather than
// the live document keeps validation from matching (or disturbing) real UI nodes.
export function isValidSelector(selector: string): boolean {
  try {
    createFragment().querySelector(selector);
    return true;
  } catch {
    return false;
  }
}

// --- Plugin ---

export default class BringToFrontPlugin extends Plugin {
  settings!: BringToFrontSettings;
  private lastFocusTime = 0;
  private observer: MutationObserver | null = null;
  private restartTimer: number | null = null;
  private cachedKeywords: string[] = [];
  private deferredObservers = new Map<MutationObserver, number>();
  private watchedTargets = new WeakSet<HTMLElement>();
  public t!: (key: TranslationKey) => string;

  private debug(msg: string) {
    if (this.settings?.debugMode) console.debug(`[Bring to Front] ${msg}`);
  }

  async onload() {
    await this.loadSettings();
    this.updateTranslations();
    this.addSettingTab(new BringToFrontSettingTab(this.app, this));
    if (this.settings.enabled) this.setupDetection();
    this.debug("Plugin loaded");
  }

  onunload() {
    this.cleanup();
  }

  private cleanup() {
    this.observer?.disconnect();
    this.observer = null;
    if (this.restartTimer) window.clearTimeout(this.restartTimer);
    this.restartTimer = null;
    this.clearDeferredObservers();
  }

  private clearDeferredObservers() {
    for (const [obs, timer] of this.deferredObservers) {
      obs.disconnect();
      window.clearTimeout(timer);
    }
    this.deferredObservers.clear();
    this.watchedTargets = new WeakSet();
  }

  // --- Detection ---

  // The main workspace document. rootSplit is not available yet during the
  // earliest part of startup, so fall back to this renderer's document (the
  // plugin runs in the main window).
  private getMainDocument(): Document {
    return this.app.workspace.rootSplit?.doc ?? document;
  }

  private getSelector(): string {
    if (this.settings.watchScope === "custom") {
      const custom = this.settings.customSelector.trim();
      // A selector saved by an older build can still be unparseable, and the
      // settings page only refuses new ones. Fall back so the deaf state is
      // unreachable rather than merely visible.
      if (custom && isValidSelector(custom)) return custom;
      return SCOPE_SELECTORS.both;
    }
    return SCOPE_SELECTORS[this.settings.watchScope] || SCOPE_SELECTORS.both;
  }

  private setupDetection() {
    const selector = this.getSelector();
    const doc = this.getMainDocument();

    this.observer = new MutationObserver((mutations) => {
      // Quiet hours: nothing below can lead to a bring-to-front, so skip the
      // scan entirely and don't attach deferred watchers either.
      if (this.isSilenced()) return;
      // Hot path: when an Obsidian window is focused, a notice cannot lead to a
      // bring-to-front (handleMatch no-ops). With no keyword filter there are
      // also no deferred watchers to attach, so the whole scan is wasted work.
      // Use the same Electron focus check as handleMatch instead of
      // document.hasFocus(): the DOM focus can read true while the app is in
      // the background and would skip a real notice. This costs an Electron
      // call per mutation batch; correctness wins over the old DOM shortcut.
      if (this.cachedKeywords.length === 0 && this.isWindowFocused()) return;
      for (const mutation of mutations) {
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          const node = mutation.addedNodes[i];
          if (node.instanceOf(HTMLElement)) {
            this.checkNode(node, selector);
          }
        }
      }
    });
    // Watch the main workspace document, not activeDocument: Obsidian 1.14
    // renders settings (and popouts) in other documents, so watching whichever
    // one is focused would stop seeing notices after a settings change.
    this.observer.observe(doc.body, { childList: true, subtree: true });

    this.checkExisting(selector);
  }

  private checkNode(node: HTMLElement, selector: string) {
    try {
      const target = node.matches(selector) ? node : node.querySelector<HTMLElement>(selector);
      if (target) this.evaluateTarget(target);
    } catch { /* getSelector validates; this only bounds the blast radius */ }
  }

  private checkExisting(selector: string) {
    if (this.isWindowFocused()) return;
    try {
      const el = this.getMainDocument().querySelector<HTMLElement>(selector);
      if (el) this.evaluateTarget(el);
    } catch { /* getSelector validates; this only bounds the blast radius */ }
  }

  private updateKeywordCache() {
    // Full-width and ideographic commas are what a Chinese IME produces;
    // new lines cover a list pasted into the textarea.
    this.cachedKeywords = this.settings.keywords
      .split(/[,，、\r\n]+/)
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k.length > 0);
  }

  private matchesKeywords(el: HTMLElement): boolean {
    if (this.cachedKeywords.length === 0) return true;
    const text = (el.textContent || "").toLowerCase();
    return this.cachedKeywords.some((kw) => text.includes(kw));
  }

  private evaluateTarget(target: HTMLElement) {
    // With no keywords, matchesKeywords is always true, so the deferred branch
    // is only ever reached when a keyword filter is active (zero cost otherwise).
    if (this.matchesKeywords(target)) {
      this.handleMatch();
    } else {
      this.watchForDeferredText(target);
    }
  }

  // A modal/notice matched the selector but its text isn't present yet — async
  // onOpen, Notice.setMessage, or progressively-updated content. Watch only this
  // element's subtree for a bounded window and re-check, rather than adding
  // characterData to the global observer (which would fire on every keystroke).
  private watchForDeferredText(target: HTMLElement) {
    if (this.watchedTargets.has(target)) return;
    this.watchedTargets.add(target);

    const obs = new MutationObserver(() => {
      if (this.matchesKeywords(target)) {
        this.stopDeferred(obs);
        this.handleMatch();
      }
    });
    obs.observe(target, { childList: true, subtree: true, characterData: true });
    const timer = window.setTimeout(() => this.stopDeferred(obs), DEFERRED_TEXT_WINDOW_MS);
    this.deferredObservers.set(obs, timer);
  }

  private stopDeferred(obs: MutationObserver) {
    obs.disconnect();
    const timer = this.deferredObservers.get(obs);
    if (timer !== undefined) window.clearTimeout(timer);
    this.deferredObservers.delete(obs);
  }

  // --- Focus ---

  // Checked on the MutationObserver hot path, so bail on the boolean before
  // reading the clock — the default (disabled) must cost nothing per mutation.
  private isSilenced(): boolean {
    if (!this.settings.quietHoursEnabled) return false;
    const start = parseTimeToMinutes(this.settings.quietStart);
    const end = parseTimeToMinutes(this.settings.quietEnd);
    if (start === null || end === null) return false;
    const now = new Date();
    return isWithinRange(now.getHours() * 60 + now.getMinutes(), start, end);
  }

  // Console output stays English on purpose: it is what users paste into issue
  // reports, and a translated line cannot be matched against the docs.
  private handleMatch() {
    // Before isWindowFocused (a pure integer compare vs. an Electron IPC call)
    // and before the cooldown, so a silenced match doesn't spend the cooldown.
    if (this.isSilenced()) {
      this.debug("quiet hours active, skipping");
      return;
    }

    if (this.isWindowFocused()) {
      this.debug("an Obsidian window is already focused, skipping");
      return;
    }

    // Cooldown active → skip
    if (this.settings.focusInterval > 0) {
      const now = Date.now();
      if ((now - this.lastFocusTime) / 1000 < this.settings.focusInterval) {
        this.debug("cooldown active, skipping");
        return;
      }
      this.lastFocusTime = now;
    }

    this.debug("match detected, bringing to front");
    void this.bringToFront();
  }

  private isWindowFocused(): boolean {
    const remote = this.getElectronRemote();
    if (!remote) return this.getMainDocument().hasFocus();
    try {
      // Obsidian 1.14 can put settings (and notes) in separate windows. The
      // main window being blurred does not mean the app is in the background:
      // raising it then would steal focus from another Obsidian window.
      const windows = remote.BrowserWindow?.getAllWindows?.();
      if (windows && windows.length > 0) {
        return windows.some((w) => !w.isMinimized() && w.isVisible() && w.isFocused());
      }
      return remote.getCurrentWindow().isFocused();
    } catch {
      // A window can be destroyed while we iterate, or the remote call can
      // fail. Treat focus as unknown and let the raise attempt continue rather
      // than losing the notice inside the observer callback.
      return false;
    }
  }

  private async bringToFront() {
    try {
      window.focus();
      const win = this.getElectronWindow();
      if (!win) return;
      if (win.isMinimized()) win.restore();
      if (!win.isVisible()) win.show();
      if (!win.isAlwaysOnTop()) {
        win.setAlwaysOnTop(true);
        await new Promise((r) => window.setTimeout(r, 200));
        win.setAlwaysOnTop(false);
      }
      win.focus();
    } catch (e) {
      console.error("[Bring to Front]", e);
    }
  }

  private getElectronRemote(): ElectronRemote | null {
    try {
      const electronWindow = window as ElectronWindow;
      if (!electronWindow.require) return null;
      try {
        const remote = electronWindow.require<ElectronRemote>("@electron/remote");
        if (remote) return remote;
      } catch { /* fallback to legacy */ }
      const electron = electronWindow.require<{ remote?: ElectronRemote }>("electron");
      return electron?.remote ?? null;
    } catch {
      return null;
    }
  }

  private getElectronWindow(): ElectronBrowserWindow | null {
    return this.getElectronRemote()?.getCurrentWindow() ?? null;
  }

  // --- i18n ---

  private updateTranslations() {
    const lang = this.getLanguage();
    this.t = (key: TranslationKey) => translations[lang][key] || translations["en"][key] || key;
  }

  private getLanguage(): "en" | "zh" {
    if (this.settings.language === "zh") return "zh";
    if (this.settings.language === "en") return "en";
    // Obsidian's official getLanguage() returns the UI language (a moment locale
    // like "zh"/"zh-TW"). It has been available since app 1.8.7, well below the
    // manifest minAppVersion.
    const obsidianLang = getObsidianLanguage();
    // "Follow Obsidian" must follow Obsidian even when the system locale
    // differs; only fall back when the app cannot report a language.
    if (obsidianLang) return obsidianLang.toLowerCase().includes("zh") ? "zh" : "en";
    return navigator.language.toLowerCase().includes("zh") ? "zh" : "en";
  }

  // --- Settings ---

  async loadSettings() {
    const data = (await this.loadData()) as Partial<BringToFrontSettings> | null;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
    this.updateKeywordCache();
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.updateTranslations();
    this.updateKeywordCache();
  }

  restartDetection() {
    // Debounce: settings onChange fires on every keystroke
    if (this.restartTimer) window.clearTimeout(this.restartTimer);
    this.restartTimer = window.setTimeout(() => {
      this.restartTimer = null;
      this.cleanup();
      if (this.settings.enabled) this.setupDetection();
    }, 300);
  }

  // The on/off switch acts immediately — waiting for a debounce would leave the
  // window raisable for 300ms after the user asked it to stop.
  async setEnabled(enabled: boolean) {
    this.settings.enabled = enabled;
    await this.saveSettings();
    this.cleanup();
    if (enabled) this.setupDetection();
  }
}

// --- Settings Tab ---

// Obsidian 1.13.0 added a declarative settings API: a tab that returns
// definitions from getSettingDefinitions() is rendered from them, and its
// settings are indexed by the settings search. The tab is written against that
// API (manifest minAppVersion 1.13.0) rather than against the imperative
// display() it replaced. Only the rows a bound control cannot carry — inline
// warnings, two fields on one row, prose — are still built by hand, in the row
// builders at the bottom.
class BringToFrontSettingTab extends PluginSettingTab {
  plugin: BringToFrontPlugin;

  constructor(app: App, plugin: BringToFrontPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  private t(key: TranslationKey): string {
    return this.plugin.t(key);
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    const t = this.t.bind(this);
    // Everything in styles.css hangs off this class so the plugin never
    // restyles the host's settings pane outside its own tab.
    this.containerEl.addClass("btf-settings");

    return [
      {
        name: t("introTitle"),
        desc: t("introDesc"),
        // Prose, not a setting: it could only ever match a search for itself.
        searchable: false,
        render: (setting) => { setting.setHeading(); },
      },
      {
        name: t("enabled"),
        desc: t("enabledDesc"),
        aliases: ["on", "off", "pause"],
        control: { type: "toggle", key: "enabled" },
      },
      {
        name: t("language"),
        desc: t("languageDesc"),
        aliases: ["locale", "chinese", "中文"],
        control: {
          type: "dropdown",
          key: "language",
          options: { auto: t("auto"), zh: t("chinese"), en: t("english") },
        },
      },
      {
        name: t("keywords"),
        desc: t("keywordsDesc"),
        aliases: ["filter", "words", "text"],
        control: { type: "textarea", key: "keywords", placeholder: t("keywordsPlaceholder"), rows: 2 },
      },
      {
        name: t("watchScope"),
        desc: t("watchScopeDesc"),
        aliases: ["modal", "dialog", "notice", "notification"],
        control: {
          type: "dropdown",
          key: "watchScope",
          options: {
            modal: t("scopeModal"),
            notice: t("scopeNotice"),
            both: t("scopeBoth"),
            custom: t("scopeCustom"),
          },
        },
      },
      {
        // desc is set here even though the builder below rewrites it on every
        // keystroke: it is what the row describes while the input is valid, it
        // gives the settings search the full sentence, and it is what makes the
        // row own a description element at all.
        name: t("customSelector"),
        desc: t("customSelectorDesc"),
        aliases: ["css", "query"],
        visible: () => this.plugin.settings.watchScope === "custom",
        render: (setting) => this.buildSelectorRow(setting),
      },
      {
        name: t("focusInterval"),
        desc: t("focusIntervalDesc"),
        aliases: ["cooldown", "seconds", "delay"],
        render: (setting) => this.buildCooldownRow(setting),
      },
      {
        name: t("quietHours"),
        desc: t("quietHoursDesc"),
        aliases: ["do not disturb", "silence", "night"],
        control: { type: "toggle", key: "quietHoursEnabled" },
      },
      {
        name: t("quietRange"),
        // The times are one value: a sub-row of the toggle above, which is what
        // a search should hit. The builder decides what the description says.
        desc: t("quietHoursDesc"),
        searchable: false,
        visible: () => this.plugin.settings.quietHoursEnabled,
        render: (setting) => this.buildQuietRangeRow(setting),
      },
      {
        name: t("debugMode"),
        desc: t("debugModeDesc"),
        aliases: ["console", "log"],
        control: { type: "toggle", key: "debugMode" },
      },
      {
        name: t("guide"),
        searchable: false,
        render: (setting) => {
          // The guide is a <details> block rather than a row, so the row the
          // framework built is emptied and replaced by the block itself.
          setting.settingEl.empty();
          setting.settingEl.addClass("btf-guide-row");
          this.buildGuide(setting.settingEl);
        },
      },
    ];
  }

  // Every control definition binds to a key in this.plugin.settings. The stock
  // implementation writes the value straight to storage, but this plugin's
  // saveSettings() also refreshes the translations and the keyword cache, and
  // two of these keys change what detection watches — so every write goes
  // through here.
  async setControlValue(key: string, value: unknown): Promise<void> {
    const settings = this.plugin.settings;
    switch (key) {
      case "enabled":
        // The on/off switch acts immediately rather than after the debounce.
        await this.plugin.setEnabled(value === true);
        return;
      case "language":
        settings.language = value as BringToFrontSettings["language"];
        break;
      case "keywords":
        settings.keywords = String(value);
        break;
      case "watchScope":
        settings.watchScope = value as BringToFrontSettings["watchScope"];
        break;
      case "quietHoursEnabled":
        settings.quietHoursEnabled = value === true;
        break;
      case "debugMode":
        settings.debugMode = value === true;
        break;
      default:
        return;
    }

    await this.plugin.saveSettings();
    // Detection watches the keywords and the scope, so it has to be rebuilt.
    if (key === "keywords" || key === "watchScope") this.plugin.restartDetection();
    // These change which rows are on screen, or what every label on the tab
    // says, so the definitions have to be asked again rather than patched.
    if (key === "language" || key === "watchScope" || key === "quietHoursEnabled") this.update();
  }

  // --- Row builders ---
  // Everything a bound control cannot carry: a field that has to warn while it
  // is being typed, two fields that share one row, and the prose guide. Each
  // builder fills in only that, so the name and description above stay the
  // single source of what the settings search indexes.

  private buildSelectorRow(row: Setting) {
    const t = this.t.bind(this);
    const flag = (el: HTMLElement, bad: boolean) => {
      el.toggleClass("is-invalid", bad);
      row.descEl.setText(bad ? t("selectorInvalid") : t("customSelectorDesc"));
      row.descEl.toggleClass("mod-warning", bad);
    };
    row.addText((tx) => {
      const stored = this.plugin.settings.customSelector.trim();
      // A bad selector saved by an older build surfaces on open, not only on edit.
      flag(tx.inputEl, stored.length > 0 && !isValidSelector(stored));
      tx.setPlaceholder(".modal-container, .notice")
        .setValue(this.plugin.settings.customSelector)
        .onChange(async (v) => {
          const trimmed = v.trim();
          const bad = trimmed.length > 0 && !isValidSelector(trimmed);
          flag(tx.inputEl, bad);
          // Keep the last good selector running rather than going deaf.
          if (bad) return;
          this.plugin.settings.customSelector = v;
          await this.plugin.saveSettings();
          this.plugin.restartDetection();
        });
    });
  }

  private buildCooldownRow(row: Setting) {
    const t = this.t.bind(this);
    const flag = (tx: TextComponent, bad: boolean) => {
      tx.inputEl.toggleClass("is-invalid", bad);
      row.descEl.setText(bad ? t("secondsInvalid") : t("focusIntervalDesc"));
      row.descEl.toggleClass("mod-warning", bad);
    };
    row.addText((tx) => {
      tx.setValue(String(this.plugin.settings.focusInterval))
        .onChange(async (v) => {
          const n = Number.parseInt(v, 10);
          if (v.trim() === "" || Number.isNaN(n) || n < 0) { flag(tx, true); return; }
          flag(tx, false);
          this.plugin.settings.focusInterval = n;
          await this.plugin.saveSettings();
        });
      tx.inputEl.type = "number"; tx.inputEl.min = "0"; tx.inputEl.step = "1";
      // On the way out, make the field say what is actually stored.
      tx.inputEl.addEventListener("blur", () => {
        tx.inputEl.value = String(this.plugin.settings.focusInterval);
        flag(tx, false);
      });
    });
  }

  private buildQuietRangeRow(row: Setting) {
    const t = this.t.bind(this);
    const flag = () => {
      const start = parseTimeToMinutes(this.plugin.settings.quietStart);
      const end = parseTimeToMinutes(this.plugin.settings.quietEnd);
      // Equal ends is a valid-looking range that silences nothing, so it needs
      // its own message rather than the missing-value warning.
      if (start === null || end === null) {
        row.descEl.setText(t("quietUnset"));
        row.descEl.toggleClass("mod-warning", true);
      } else if (start === end) {
        row.descEl.setText(t("quietSame"));
        row.descEl.toggleClass("mod-warning", false);
      } else {
        row.descEl.setText("");
        row.descEl.toggleClass("mod-warning", false);
      }
    };
    // Two identical controls share one row label, so each needs its own name.
    row.addText((tx) => {
      tx.setValue(this.plugin.settings.quietStart)
        .onChange(async (v) => { this.plugin.settings.quietStart = v; await this.plugin.saveSettings(); flag(); });
      tx.inputEl.type = "time";
      tx.inputEl.setAttribute("aria-label", t("quietStart"));
    });
    row.controlEl.createSpan({ cls: "btf-arrow", text: "→" });
    row.addText((tx) => {
      tx.setValue(this.plugin.settings.quietEnd)
        .onChange(async (v) => { this.plugin.settings.quietEnd = v; await this.plugin.saveSettings(); flag(); });
      tx.inputEl.type = "time";
      tx.inputEl.setAttribute("aria-label", t("quietEnd"));
    });
    flag();
  }

  private buildGuide(containerEl: HTMLElement) {
    const t = this.t.bind(this);
    const guide = containerEl.createEl("details", { cls: "btf-guide" });
    const summary = guide.createEl("summary");
    setIcon(summary.createDiv("collapse-icon"), "chevron-right");
    summary.createSpan({ text: t("guide") });
    const gc = guide.createDiv();
    gc.createEl("p", { text: t("guideKeywords") });
    gc.createEl("p", { text: t("guideScope") });
    gc.createEl("p", { text: t("guideQuiet") });
    new Setting(gc).setName(t("guideExamples")).setHeading();
    const ul = gc.createEl("ul");
    ul.createEl("li", { text: t("guideEx1") });
    ul.createEl("li", { text: t("guideEx2") });
    ul.createEl("li", { text: t("guideEx3") });
    gc.createEl("p", { text: t("guideTip") });
  }
}
