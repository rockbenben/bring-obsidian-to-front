import { App, Plugin, PluginSettingTab, Setting } from "obsidian";

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

interface ObsidianApp extends App {
  vault: { config?: { language?: string } } & App["vault"];
}

// --- i18n ---

type TranslationKey =
  | "language" | "languageDesc" | "auto" | "chinese" | "english"
  | "keywords" | "keywordsDesc"
  | "watchScope" | "watchScopeDesc"
  | "scopeModal" | "scopeNotice" | "scopeBoth" | "scopeCustom"
  | "customSelector" | "customSelectorDesc"
  | "focusInterval" | "focusIntervalDesc"
  | "debugMode" | "debugModeDesc"
  | "matchDetected" | "windowFocused" | "cooldownActive"
  | "guide" | "guideKeywords" | "guideScope" | "guideExamples"
  | "guideEx1" | "guideEx2" | "guideEx3" | "guideTip";

type TranslationRecord = Record<TranslationKey, string>;

const translations: { en: TranslationRecord; zh: TranslationRecord } = {
  en: {
    language: "Language", languageDesc: "Display language", auto: "Auto", chinese: "中文", english: "English",
    keywords: "Keywords (optional)",
    keywordsDesc: "Leave empty to bring to front on any modal/notice when Obsidian is in the background. Add comma-separated keywords to trigger when any one of them appears.",
    watchScope: "Watch scope", watchScopeDesc: "Which elements to monitor",
    scopeModal: "Modals", scopeNotice: "Notices", scopeBoth: "Modals & notices", scopeCustom: "Custom selector",
    customSelector: "CSS selector", customSelectorDesc: "Custom CSS selector (e.g. .modal-container, [data-type=\"my-plugin\"])",
    focusInterval: "Focus cooldown (seconds)", focusIntervalDesc: "Minimum time between focus actions. Prevents repeated focus stealing. 0 = no cooldown",
    debugMode: "Debug mode", debugModeDesc: "Log matching details to console (Ctrl+Shift+I)",
    matchDetected: "Match detected, bringing to front",
    windowFocused: "Window already focused, skipping",
    cooldownActive: "Cooldown active, skipping",
    guide: "Quick start guide",
    guideKeywords: "By default (no keywords), Obsidian is brought to front whenever a modal or notice appears while it is in the background. Add comma-separated keywords to only trigger when any keyword appears in the element text.",
    guideScope: "Watch scope: \"Modals\" watches popup dialogs, \"Notices\" watches toast messages, \"Both\" watches everything. Use \"Custom\" for advanced CSS selectors.",
    guideExamples: "Examples",
    guideEx1: "Reminder popup → keywords \"snooze, done\", scope \"Modals\"",
    guideEx2: "Error alerts → keywords \"error, failed\", scope \"Notices\"",
    guideEx3: "All modals & notices → leave keywords empty, scope \"Both\" (default)",
    guideTip: "Tip: To find a CSS selector — open DevTools (Ctrl+Shift+I), click the inspect icon (top-left of DevTools panel), click the target element, then use the class names shown in the Elements panel (e.g. .my-plugin-modal).",
  },
  zh: {
    language: "语言", languageDesc: "显示语言", auto: "自动", chinese: "中文", english: "English",
    keywords: "关键词（可选）",
    keywordsDesc: "留空即可：后台出现弹窗或通知时自动置顶。填写逗号分隔的关键词，出现任一即触发。",
    watchScope: "监听范围", watchScopeDesc: "监听哪类元素",
    scopeModal: "弹窗", scopeNotice: "通知", scopeBoth: "弹窗和通知", scopeCustom: "自定义选择器",
    customSelector: "CSS 选择器", customSelectorDesc: "自定义 CSS 选择器（如 .modal-container、[data-type=\"my-plugin\"]）",
    focusInterval: "聚焦冷却（秒）", focusIntervalDesc: "两次置顶之间的最小间隔，防止反复抢焦。0 = 不限制",
    debugMode: "调试模式", debugModeDesc: "在控制台（Ctrl+Shift+I）输出匹配日志",
    matchDetected: "检测到匹配，正在置顶",
    windowFocused: "窗口已在前台，跳过",
    cooldownActive: "冷却中，跳过",
    guide: "入门指南",
    guideKeywords: "默认无需配置：后台出现弹窗或通知时自动置顶。如需过滤，填入逗号分隔的关键词，出现任一关键词即触发。",
    guideScope: "监听范围：「弹窗」监听对话框弹窗，「通知」监听右上角提示消息，「弹窗和通知」同时监听两者。需要更灵活的匹配请选「自定义」输入 CSS 选择器。",
    guideExamples: "配置示例",
    guideEx1: "提醒弹窗 → 关键词 \"snooze, done\"，范围「弹窗」",
    guideEx2: "错误提示 → 关键词 \"error, failed\"，范围「通知」",
    guideEx3: "所有弹窗和通知 → 关键词留空，范围「弹窗和通知」（默认）",
    guideTip: "提示：查找 CSS 选择器——打开开发者工具（Ctrl+Shift+I），点击左上角的选择器图标，点击目标元素，在 Elements 面板中查看 class 名称（如 .my-plugin-modal）。",
  },
};

// --- Settings ---

interface BringToFrontSettings {
  keywords: string;
  watchScope: "modal" | "notice" | "both" | "custom";
  customSelector: string;
  focusInterval: number;
  language: "auto" | "zh" | "en";
  debugMode: boolean;
}

const SCOPE_SELECTORS: Record<string, string> = {
  modal: ".modal-container",
  notice: ".notice",
  both: ".modal-container, .notice",
};

const DEFAULT_SETTINGS: BringToFrontSettings = {
  keywords: "",
  watchScope: "both",
  customSelector: "",
  focusInterval: 5,
  language: "auto",
  debugMode: false,
};

// --- Plugin ---

export default class BringToFrontPlugin extends Plugin {
  settings!: BringToFrontSettings;
  private lastFocusTime = 0;
  private observer: MutationObserver | null = null;
  private restartTimer: number | null = null;
  private cachedKeywords: string[] = [];
  public t!: (key: TranslationKey) => string;

  private debug(msg: string) {
    if (this.settings?.debugMode) console.debug(`[Bring to Front] ${msg}`);
  }

  async onload() {
    await this.loadSettings();
    this.updateTranslations();
    this.addSettingTab(new BringToFrontSettingTab(this.app, this));
    this.setupDetection();
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
  }

  // --- Detection ---

  private getSelector(): string {
    if (this.settings.watchScope === "custom") {
      return this.settings.customSelector.trim() || SCOPE_SELECTORS.both;
    }
    return SCOPE_SELECTORS[this.settings.watchScope] || SCOPE_SELECTORS.both;
  }

  private setupDetection() {
    const selector = this.getSelector();

    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          const node = mutation.addedNodes[i];
          if (node instanceof HTMLElement) {
            this.checkNode(node, selector);
          }
        }
      }
    });
    this.observer.observe(document.body, { childList: true, subtree: true });

    this.checkExisting(selector);
  }

  private checkNode(node: HTMLElement, selector: string) {
    try {
      let target: HTMLElement | null = null;
      if (node.matches(selector)) {
        target = node;
      } else {
        target = node.querySelector<HTMLElement>(selector);
      }
      if (target && this.matchesKeywords(target)) {
        this.handleMatch();
      }
    } catch { /* invalid selector */ }
  }

  private checkExisting(selector: string) {
    if (this.isWindowFocused()) return;
    try {
      const el = document.querySelector<HTMLElement>(selector);
      if (el && this.matchesKeywords(el)) {
        this.handleMatch();
      }
    } catch { /* invalid selector */ }
  }

  private updateKeywordCache() {
    this.cachedKeywords = this.settings.keywords.split(",").map((k) => k.trim().toLowerCase()).filter((k) => k.length > 0);
  }

  private matchesKeywords(el: HTMLElement): boolean {
    if (this.cachedKeywords.length === 0) return true;
    const text = (el.textContent || "").toLowerCase();
    return this.cachedKeywords.some((kw) => text.includes(kw));
  }

  // --- Focus ---

  private handleMatch() {
    if (this.isWindowFocused()) {
      this.debug(this.t("windowFocused"));
      return;
    }

    // Cooldown active → skip
    if (this.settings.focusInterval > 0) {
      const now = Date.now();
      if ((now - this.lastFocusTime) / 1000 < this.settings.focusInterval) {
        this.debug(this.t("cooldownActive"));
        return;
      }
      this.lastFocusTime = now;
    }

    this.debug(this.t("matchDetected"));
    void this.bringToFront();
  }

  private isWindowFocused(): boolean {
    const win = this.getElectronWindow();
    if (win) return win.isFocused();
    return document.hasFocus();
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
        await new Promise((r) => setTimeout(r, 200));
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
    const obsidianApp = this.app as ObsidianApp;
    const obsidianLang = obsidianApp.vault?.config?.language;
    const systemLang = navigator.language.toLowerCase();
    return obsidianLang?.includes("zh") || systemLang.includes("zh") ? "zh" : "en";
  }

  // --- Settings ---

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
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
      this.setupDetection();
    }, 300);
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

    // Watch scope
    new Setting(containerEl).setName(t("watchScope")).setDesc(t("watchScopeDesc"))
      .addDropdown((dd) => dd
        .addOption("modal", t("scopeModal")).addOption("notice", t("scopeNotice"))
        .addOption("both", t("scopeBoth")).addOption("custom", t("scopeCustom"))
        .setValue(this.plugin.settings.watchScope)
        .onChange(async (v) => { this.plugin.settings.watchScope = v as "modal" | "notice" | "both" | "custom"; await this.plugin.saveSettings(); this.plugin.restartDetection(); this.display(); }));

    // Custom selector (only when scope = custom)
    if (this.plugin.settings.watchScope === "custom") {
      new Setting(containerEl).setName(t("customSelector")).setDesc(t("customSelectorDesc"))
        .addText((tx) => tx
          .setPlaceholder(".modal-container, .notice")
          .setValue(this.plugin.settings.customSelector)
          .onChange(async (v) => { this.plugin.settings.customSelector = v; await this.plugin.saveSettings(); this.plugin.restartDetection(); }));
    }

    // Focus cooldown (main setting, not advanced)
    new Setting(containerEl).setName(t("focusInterval")).setDesc(t("focusIntervalDesc"))
      .addText((tx) => {
        tx.setPlaceholder("5").setValue(String(this.plugin.settings.focusInterval))
          .onChange(async (v) => { const n = parseInt(v); if (!isNaN(n) && n >= 0) { this.plugin.settings.focusInterval = n; await this.plugin.saveSettings(); } });
        tx.inputEl.type = "number"; tx.inputEl.min = "0"; tx.inputEl.step = "1";
      });

    // Debug
    new Setting(containerEl).setName(t("debugMode")).setDesc(t("debugModeDesc"))
      .addToggle((tg) => tg.setValue(this.plugin.settings.debugMode).onChange(async (v) => { this.plugin.settings.debugMode = v; await this.plugin.saveSettings(); }));

    // --- Guide ---
    const guide = containerEl.createEl("details");
    guide.createEl("summary", { text: t("guide") });
    const gc = guide.createDiv();
    gc.createEl("p", { text: t("guideKeywords") });
    gc.createEl("p", { text: t("guideScope") });
    new Setting(gc).setName(t("guideExamples")).setHeading();
    const ul = gc.createEl("ul");
    ul.createEl("li", { text: t("guideEx1") });
    ul.createEl("li", { text: t("guideEx2") });
    ul.createEl("li", { text: t("guideEx3") });
    gc.createEl("p", { text: t("guideTip") });
  }
}
