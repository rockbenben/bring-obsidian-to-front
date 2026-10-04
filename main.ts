import { App, Plugin, PluginSettingTab, Setting, getLanguage as getObsidianLanguage, setIcon } from "obsidian";

// Electron interfaces
interface ElectronWindow extends Window {
  require?: <T = unknown>(module: string) => T;
}

interface ElectronRemote {
  getCurrentWindow(): ElectronBrowserWindow;
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
  | "keywords" | "keywordsDesc"
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
    keywordsDesc: "Empty = any pop-up. Or list comma-separated words to react only to those.",
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
    keywordsDesc: "留空 = 任何弹窗都置顶；填写逗号分隔的词语，只匹配包含它们的弹窗。",
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

    this.observer = new MutationObserver((mutations) => {
      // Quiet hours: nothing below can lead to a bring-to-front, so skip the
      // scan entirely and don't attach deferred watchers either.
      if (this.isSilenced()) return;
      // Hot path: editor churn (the bulk of DOM mutations) happens while the
      // window is focused, and a focused window can never trigger a bring-to-
      // front (handleMatch no-ops). With no keyword filter there are also no
      // deferred watchers to attach — so the whole scan is wasted work. Skip it.
      // Gate on the main renderer window's focus — the same window
      // handleMatch/bringToFront act on. Read via workspace.rootSplit.doc
      // rather than activeDocument, which points at a focused pop-out and would
      // wrongly skip a notice firing in the background main window. Cheap DOM
      // read (no Electron IPC); a false negative only forgoes the optimization,
      // never changes behavior.
      if (this.cachedKeywords.length === 0 && this.app.workspace.rootSplit.doc.hasFocus()) return;
      for (const mutation of mutations) {
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          const node = mutation.addedNodes[i];
          if (node.instanceOf(HTMLElement)) {
            this.checkNode(node, selector);
          }
        }
      }
    });
    this.observer.observe(activeDocument.body, { childList: true, subtree: true });

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
      const el = activeDocument.querySelector<HTMLElement>(selector);
      if (el) this.evaluateTarget(el);
    } catch { /* getSelector validates; this only bounds the blast radius */ }
  }

  private updateKeywordCache() {
    this.cachedKeywords = this.settings.keywords.split(",").map((k) => k.trim().toLowerCase()).filter((k) => k.length > 0);
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
      this.debug("window already focused, skipping");
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
    const win = this.getElectronWindow();
    if (win) return win.isFocused();
    return activeDocument.hasFocus();
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

  private getElectronWindow(): ElectronBrowserWindow | null {
    try {
      const electronWindow = window as ElectronWindow;
      if (electronWindow.require) {
        try {
          const remote = electronWindow.require<ElectronRemote>("@electron/remote");
          if (remote) return remote.getCurrentWindow();
        } catch { /* fallback to legacy */ }
        const electron = electronWindow.require<{ remote?: ElectronRemote }>("electron");
        return electron?.remote?.getCurrentWindow() ?? null;
      }
    } catch { /* fall through */ }
    return null;
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
    // like "zh"/"zh-TW"). Requires app 1.8.7+ (see manifest minAppVersion).
    const obsidianLang = getObsidianLanguage();
    const systemLang = navigator.language.toLowerCase();
    return obsidianLang?.includes("zh") || systemLang.includes("zh") ? "zh" : "en";
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

class BringToFrontSettingTab extends PluginSettingTab {
  plugin: BringToFrontPlugin;

  constructor(app: App, plugin: BringToFrontPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    const t = this.plugin.t.bind(this.plugin);
    containerEl.empty();
    // Everything in styles.css hangs off this class so the plugin never restyles
    // the host's settings pane outside its own tab.
    containerEl.addClass("btf-settings");

    // Intro: the host hides the modal header in the sidebar layout, so without
    // this the pane would never say what the plugin does.
    new Setting(containerEl).setName(t("introTitle")).setDesc(t("introDesc")).setHeading();

    // Master switch: the only way to stop raising without deleting the config.
    new Setting(containerEl).setName(t("enabled")).setDesc(t("enabledDesc"))
      .addToggle((tg) => tg.setValue(this.plugin.settings.enabled)
        .onChange(async (v) => { await this.plugin.setEnabled(v); this.display(); }));

    // Language
    new Setting(containerEl).setName(t("language")).setDesc(t("languageDesc"))
      .addDropdown((dd) => dd
        .addOption("auto", t("auto")).addOption("zh", t("chinese")).addOption("en", t("english"))
        .setValue(this.plugin.settings.language)
        .onChange(async (v) => { this.plugin.settings.language = v as "auto" | "zh" | "en"; await this.plugin.saveSettings(); this.display(); }));

    // Keywords
    new Setting(containerEl).setName(t("keywords")).setDesc(t("keywordsDesc"))
      .addTextArea((ta) => {
        ta.setPlaceholder("Snooze, done").setValue(this.plugin.settings.keywords)
          .onChange(async (v) => { this.plugin.settings.keywords = v; await this.plugin.saveSettings(); this.plugin.restartDetection(); });
        ta.inputEl.rows = 2;
      });

    // Watch for
    new Setting(containerEl).setName(t("watchScope")).setDesc(t("watchScopeDesc"))
      .addDropdown((dd) => dd
        .addOption("modal", t("scopeModal")).addOption("notice", t("scopeNotice"))
        .addOption("both", t("scopeBoth")).addOption("custom", t("scopeCustom"))
        .setValue(this.plugin.settings.watchScope)
        .onChange(async (v) => { this.plugin.settings.watchScope = v as "modal" | "notice" | "both" | "custom"; await this.plugin.saveSettings(); this.plugin.restartDetection(); this.display(); }));

    // Selector (only when the scope is the custom one)
    if (this.plugin.settings.watchScope === "custom") {
      const row = new Setting(containerEl).setName(t("customSelector")).setDesc(t("customSelectorDesc"));
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

    // Cooldown
    const cooldown = new Setting(containerEl).setName(t("focusInterval")).setDesc(t("focusIntervalDesc"));
    cooldown.addText((tx) => {
      const flag = (bad: boolean) => {
        tx.inputEl.toggleClass("is-invalid", bad);
        cooldown.descEl.setText(bad ? t("secondsInvalid") : t("focusIntervalDesc"));
        cooldown.descEl.toggleClass("mod-warning", bad);
      };
      tx.setValue(String(this.plugin.settings.focusInterval))
        .onChange(async (v) => {
          const n = Number.parseInt(v, 10);
          if (v.trim() === "" || Number.isNaN(n) || n < 0) { flag(true); return; }
          flag(false);
          this.plugin.settings.focusInterval = n;
          await this.plugin.saveSettings();
        });
      tx.inputEl.type = "number"; tx.inputEl.min = "0"; tx.inputEl.step = "1";
      // On the way out, make the field say what is actually stored.
      tx.inputEl.addEventListener("blur", () => {
        tx.inputEl.value = String(this.plugin.settings.focusInterval);
        flag(false);
      });
    });

    // Quiet hours
    new Setting(containerEl).setName(t("quietHours")).setDesc(t("quietHoursDesc"))
      .addToggle((tg) => tg.setValue(this.plugin.settings.quietHoursEnabled)
        .onChange(async (v) => { this.plugin.settings.quietHoursEnabled = v; await this.plugin.saveSettings(); this.display(); }));

    // Both times on one row: they are one value, and two unlabelled rows read as
    // two independent settings.
    if (this.plugin.settings.quietHoursEnabled) {
      const row = new Setting(containerEl).setName(t("quietRange"));
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

    // Debug
    new Setting(containerEl).setName(t("debugMode")).setDesc(t("debugModeDesc"))
      .addToggle((tg) => tg.setValue(this.plugin.settings.debugMode).onChange(async (v) => { this.plugin.settings.debugMode = v; await this.plugin.saveSettings(); }));

    // --- Guide ---
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
