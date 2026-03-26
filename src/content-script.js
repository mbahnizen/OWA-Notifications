"use strict";

// ─── Debug Flag ──────────────────────────────────────────────────────
// Set to true only during development. Logs are suppressed in production
// to prevent leaking user preferences or folder names to the console.
const DEBUG = false;
const log = DEBUG ? console.log.bind(console) : () => {};

// ─── State ───────────────────────────────────────────────────────────
let prefs = {
  favIconColor: "#FF8000"
};
let newEventsTimer, remindersTimer, popupTimer;

const state = {
  monitoredCount: 0,
  otherCount: 0,
  remindersCount: 0,
  chatCount: 0,
  lastNotificationTime: 0
};
const initialDocumentTitle = document.title;
const initialOwaIcon = getCurrentFavIcon();
const owaIcon = createIconElement();

browser.storage.onChanged.addListener(onPrefChanged);

// ─── OWA Environment Detection ──────────────────────────────────────
// Detects whether the current page is actually an OWA/Outlook Web UI
// by inspecting DOM structure rather than relying solely on URL patterns.
// This prevents the extension from running on non-OWA pages that happen
// to match the URL pattern (e.g., /owa/ in an unrelated site).

function isOWAEnvironment() {
  // Strategy 1: Check for Outlook-specific folder tree (modern OWA/365)
  const hasTreeItems = document.querySelectorAll('[role="treeitem"]').length > 0;
  const hasFolderPane = document.getElementById("MailFolderPane.FavoritesFolders") !== null;

  // Strategy 2: Check for OWA-specific notification elements
  const hasOWANotifications = document.querySelector(".o365cs-notifications-notificationPopup") !== null;

  // Strategy 3: Check for legacy OWA elements
  const hasMailTree = document.getElementById("mailtree") !== null;

  // Strategy 4: Check for Outlook-specific aria labels
  const hasFolderPaneLabel = document.querySelector('[aria-label="Folder Pane"]') !== null;

  return hasTreeItems || hasFolderPane || hasOWANotifications || hasMailTree || hasFolderPaneLabel;
}

// Delay initial start to allow OWA to render its DOM
setTimeout(() => {
  if (isOWAEnvironment()) {
    log("OWA environment detected, starting monitor.");
    getPrefsAndStart();
  } else {
    log("OWA environment NOT detected. Retrying in 5s...");
    // OWA can be slow to render — retry once after 5 seconds
    setTimeout(() => {
      if (isOWAEnvironment()) {
        log("OWA environment detected on retry, starting monitor.");
        getPrefsAndStart();
      } else {
        log("OWA environment not found after retry. Extension will not activate on this page.");
      }
    }, 5000);
  }
}, 2000);

// ─── Favicon Utilities ───────────────────────────────────────────────

function createIconElement() {
  const icon = document.createElement("link");
  icon.rel = "icon";
  icon.type = "image/png";
  icon.sizes = "16x16";
  icon.href = generateTabIcon(0);
  return icon;
}

function getCurrentFavIcon() {
  const icons = document.head.querySelectorAll("link[rel*=icon]");
  if (icons.length > 0) {
    return icons[icons.length - 1];
  }
  return createIconElement();
}

function generateTabIcon(number, colorOverride) {
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = colorOverride || prefs.favIconColor;
  ctx.beginPath();
  ctx.arc(8, 8, 9, 0, 2 * Math.PI);
  ctx.fill();
  ctx.font = "bold 12px Helvetica, sans-serif";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillStyle = "white";
  ctx.shadowBlur = 1;
  ctx.shadowColor = "black";
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  ctx.fillText(number, 8, 8);
  return canvas.toDataURL("image/png");
}

function restoreOriginalOwaIcon() {
  document.head.appendChild(initialOwaIcon);
}

function setFavicon(count, color) {
  const nr = Math.min(count, 99);
  if (nr) {
    owaIcon.href = generateTabIcon(nr, color);
    document.head.appendChild(owaIcon);
  } else {
    restoreOriginalOwaIcon();
  }
}

// ─── Document Title ──────────────────────────────────────────────────

function restoreInitialDocumentTitle() {
  document.title = initialDocumentTitle;
}

function setDocumentTitle(emails, reminders, chats) {
  let countPrefix = "";
  if (emails > 0 || reminders > 0 || chats > 0) {
    countPrefix = "(" + emails + "/" + reminders;
    if (chats > 0) {
      countPrefix = countPrefix + "/" + chats;
    }
    countPrefix = countPrefix + ") ";
  }
  document.title = countPrefix + initialDocumentTitle;
}

// ─── Count Extraction Helpers ────────────────────────────────────────

/**
 * Extracts the first integer found in a string.
 * Used to parse unread count numbers from DOM node text.
 * @param {string} text - The text to extract a number from.
 * @returns {number} The extracted number, or 0 if none found.
 */
function extractNumber(text) {
  if (!text) return 0;
  const match = text.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Counts the total number of visible DOM nodes in a NodeList.
 * Used for counting reminders and chat notification elements.
 * @param {NodeList} nodes - The nodes to count.
 * @returns {number} The count of visible nodes.
 */
function getCountFromNodes(nodes) {
  if (!nodes) return 0;
  let count = 0;
  for (let i = 0; i < nodes.length; i++) {
    // Only count visible nodes (offsetParent is null for hidden elements)
    if (nodes[i].offsetParent !== null) {
      count++;
    }
  }
  return count;
}

// ─── Folder Detection ────────────────────────────────────────────────

function getCountsFromNodes(nodes) {
  const counts = [];
  if (nodes) {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const folderName = getFolderName(nodes[i]);
      const count = extractNumber(nodes[i].textContent);
      if (count > 0) {
        counts.push({ name: folderName, count: count });
      }
    }
  }
  return counts;
}

function getFolderName(node) {
  try {
    // Strategy 1: aria-labelledby (OWA 2013+)
    const container = node.closest('[role="treeitem"]');
    if (container) {
      const labelledBy = container.getAttribute("aria-labelledby");
      if (labelledBy) {
        const ids = labelledBy.split(" ");
        for (const id of ids) {
          const elem = document.getElementById(id);
          if (elem && elem !== node) {
            if (elem.title) return elem.title;
            if (elem.textContent) return elem.textContent;
          }
        }
      }

      // Strategy 2: title in the container
      const titleSpan = container.querySelector("[title]");
      if (titleSpan) return titleSpan.title;
    }

    // Strategy 3: fldrnm attribute (legacy OWA)
    let curr = node;
    while (curr && curr.tagName !== "BODY") {
      if (curr.getAttribute("fldrnm")) return curr.getAttribute("fldrnm");
      if (curr.getAttribute("title") && curr !== node) return curr.getAttribute("title");
      curr = curr.parentElement;
    }
  } catch (e) {
    log("Error in getFolderName", e);
  }
  return null;
}

function shouldMonitor(folderName) {
  if (!prefs.monitoredFolders || prefs.monitoredFolders.trim() === "") {
    return true;
  }
  if (!folderName) return false;

  const folders = prefs.monitoredFolders.split(",").map(s => s.trim().toLowerCase()).filter(s => s);
  const name = folderName.toLowerCase();
  return folders.some(f => name.includes(f));
}

/**
 * Safely executes querySelectorAll with a user-provided CSS selector.
 * Returns an empty NodeList on invalid selectors instead of crashing.
 */
function safeQueryAll(selector) {
  try {
    return document.querySelectorAll(selector);
  } catch (e) {
    log("Invalid CSS selector:", selector, e);
    return [];
  }
}

function getUnreadFolders() {
  const results = [];

  // Strategy 1: Modern OWA / Outlook (Treeitems)
  const treeItems = document.querySelectorAll('[role="treeitem"]');
  if (treeItems.length > 0) {
    const uniqueFolders = new Map();
    treeItems.forEach(item => {
      let name = "";
      const folderSpan = item.querySelector('[id*=".folder"]');
      if (folderSpan && folderSpan.title) {
        name = folderSpan.title;
      } else {
        const titleSpan = item.querySelector('span[title]');
        if (titleSpan) name = titleSpan.title;
      }

      if (name) {
        let count = 0;
        const ucountSpan = item.querySelector('[id*=".ucount"]');
        if (ucountSpan && ucountSpan.textContent) {
          count = extractNumber(ucountSpan.textContent);
        }

        if (count === 0) {
          const badgeSpan = item.querySelector('div[class*="_n_44"] span, div[class*="ms-bg-color-neutralLighter"] span');
          if (badgeSpan && badgeSpan.textContent) {
            count = extractNumber(badgeSpan.textContent);
          }
        }

        if (count > 0) {
          uniqueFolders.set(name, count);
        }
      }
    });

    uniqueFolders.forEach((count, name) => {
      results.push({ name: name, count: count });
    });

    return results;
  }

  // Legacy: User-provided custom CSS selector
  if (prefs.cssForUnreadEmailsDetection) {
    return getCountsFromNodes(safeQueryAll(prefs.cssForUnreadEmailsDetection));
  }

  return [];
}

function countVisibleReminders() {
  let nodes;

  if (prefs.cssForVisibleRemindersDetection) {
    return getCountFromNodes(safeQueryAll(prefs.cssForVisibleRemindersDetection));
  }

  // Modern OWA / 365
  nodes = document.querySelectorAll(".o365cs-notifications-notificationPopup .o365cs-notifications-notificationHeaderText");
  if (nodes.length > 0) {
    return getCountFromNodes(nodes);
  }

  nodes = document.querySelectorAll('[data-storybook="reminder"]');
  if (nodes.length > 0) {
    return nodes.length;
  }

  return 0;
}

function countChatNotifications() {
  if (prefs.cssForChatNotificationsDetection) {
    return getCountFromNodes(safeQueryAll(prefs.cssForChatNotificationsDetection));
  }
  return (document.querySelectorAll(".o365cs-notifications-chat-accept").length >> 1);
}

// ─── Notification Logic ──────────────────────────────────────────────

let lastPopupTime = Date.now();

function singularOrPlural(word, count) {
  return word + ((count === 1) ? "" : "s");
}

function buildNotificationMessage(type, count) {
  return "You have " + count + " new " + singularOrPlural(type, count);
}

function buildEmailNotificationMessage(count) {
  return buildNotificationMessage("email", count);
}

function buildReminderNotificationMessage(count) {
  return buildNotificationMessage("reminder", count);
}

function triggerNotification(type, text) {
  if (!prefs.disableNotifications) {
    browser.runtime.sendMessage({
      "type": type,
      "msg": text
    });
  }
}

function checkPeriodicPopup() {
  if (typeof prefs.alertPopupInterval !== 'number' || prefs.alertPopupInterval <= 0) return;

  const now = Date.now();
  if (now - lastPopupTime < prefs.alertPopupInterval * 60 * 1000) return;

  const unreadFolders = getUnreadFolders();
  const monitoredFolders = unreadFolders.filter(f => shouldMonitor(f.name));

  if (monitoredFolders.length > 0) {
    const summary = monitoredFolders.map(f => `${f.name}: ${f.count}`).join("\n");
    triggerNotification("email", "Unread Summary:\n" + summary);
  }

  lastPopupTime = now;
}

function checkForNewMessages() {
  const allUnreadFolders = getUnreadFolders();

  const monitoredFolders = allUnreadFolders.filter(f => shouldMonitor(f.name));
  const otherFolders = allUnreadFolders.filter(f => !shouldMonitor(f.name));

  const currentMonitoredCount = monitoredFolders.reduce((acc, curr) => acc + curr.count, 0);
  const currentOtherCount = otherFolders.reduce((acc, curr) => acc + curr.count, 0);

  const newVisibleRemindersCount = countVisibleReminders();
  const newChatNotificationsCount = countChatNotifications();

  // Update Favicon
  if (prefs.updateFavIcon) {
    const totalCount = currentMonitoredCount + currentOtherCount + newVisibleRemindersCount + newChatNotificationsCount;
    let color = prefs.favIconColor;
    if (currentMonitoredCount === 0 && currentOtherCount > 0) {
      color = "#0099FF";
    }
    setFavicon(totalCount, color);
  }

  // Update Title
  if (prefs.updateDocumentTitle) {
    const countToShow = currentMonitoredCount > 0 ? currentMonitoredCount : currentOtherCount;
    setDocumentTitle(countToShow, newVisibleRemindersCount, newChatNotificationsCount);
  }

  // Notifications: Monitored Folders (Priority, No Cooldown)
  if (currentMonitoredCount > state.monitoredCount) {
    const diff = currentMonitoredCount - state.monitoredCount;
    triggerNotification("email", buildEmailNotificationMessage(diff));
  }
  // Other Folders (Respect Cooldown)
  else if (currentOtherCount > state.otherCount) {
    const hasMonitoredFolders = prefs.monitoredFolders && prefs.monitoredFolders.trim().length > 0;

    if (!hasMonitoredFolders) {
      const now = Date.now();
      const cooldownMs = (prefs.notificationCooldown || 60) * 1000;

      if (now - state.lastNotificationTime > cooldownMs) {
        const diff = currentOtherCount - state.otherCount;
        triggerNotification("email", buildEmailNotificationMessage(diff));
        state.lastNotificationTime = now;
      }
    }
  }

  if (newVisibleRemindersCount > state.remindersCount) {
    triggerNotification("reminder", buildReminderNotificationMessage(newVisibleRemindersCount - state.remindersCount));
  }
  if (newChatNotificationsCount > state.chatCount) {
    triggerNotification("chat", "New chat " + singularOrPlural("notification", newChatNotificationsCount) + "!");
  }

  // Update State
  state.monitoredCount = currentMonitoredCount;
  state.otherCount = currentOtherCount;
  state.remindersCount = newVisibleRemindersCount;
  state.chatCount = newChatNotificationsCount;

  checkPeriodicPopup();
}

function notifyReminders() {
  if (state.remindersCount > 0) {
    triggerNotification("reminder", "You have " + state.remindersCount + " " + singularOrPlural("reminder", state.remindersCount));
  }
  if (state.chatCount > 0) {
    triggerNotification("chat", "You have open chat " + singularOrPlural("notification", state.chatCount));
  }
}

// ─── Folder Scanning (for Options page) ──────────────────────────────

function scanFolders() {
  const favorites = new Set();
  const others = new Set();

  const favoritesContainer = document.getElementById("MailFolderPane.FavoritesFolders");

  const processItem = (item, set) => {
    let name = "";
    const folderSpan = item.querySelector('[id*=".folder"]');
    if (folderSpan && folderSpan.title) {
      name = folderSpan.title;
    } else {
      const titleSpan = item.querySelector('span[title]');
      if (titleSpan) name = titleSpan.title;
    }

    if (name && name.trim().length > 0 && name !== "Favorites" && name !== "Folders") {
      set.add(name);
    }
  };

  const allTreeItems = document.querySelectorAll('[role="treeitem"]');
  allTreeItems.forEach(item => {
    if (favoritesContainer && favoritesContainer.contains(item)) {
      processItem(item, favorites);
    } else {
      processItem(item, others);
    }
  });

  return {
    favorites: Array.from(favorites).sort(),
    others: Array.from(others).sort()
  };
}

// Message Listener from Options Page
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.cmd === "CMD_SCAN_FOLDERS") {
    const result = scanFolders();
    sendResponse({ result: result });
  }
});

// ─── Preferences ─────────────────────────────────────────────────────

function defaultVal(value, defaultValue) {
  return (typeof value === "undefined" || value === null) ? defaultValue : value;
}

function setNewPrefs(newPrefs) {
  prefs = newPrefs;

  const ensureNumber = (val, def) => {
    const n = parseFloat(val);
    return isNaN(n) ? def : n;
  };

  const checkInt = (prefs.checkInterval !== undefined) ? prefs.checkInterval : prefs.delayBetweenChecks;
  prefs.checkInterval = 1; // Enforced 1s

  const remindInt = (prefs.reminderInterval !== undefined) ? prefs.reminderInterval : prefs.delayBetweenReminders;
  prefs.reminderInterval = ensureNumber(remindInt, 300);

  prefs.disableNotifications = defaultVal(prefs.disableNotifications, false);
  prefs.updateFavIcon = defaultVal(prefs.updateFavIcon, true);
  prefs.favIconColor = defaultVal(prefs.favIconColor, "#FF8000");
  prefs.updateDocumentTitle = defaultVal(prefs.updateDocumentTitle, true);
  prefs.monitoredFolders = defaultVal(prefs.monitoredFolders, "");
  prefs.notificationCooldown = ensureNumber(prefs.notificationCooldown, 60);
  prefs.alertPopupInterval = ensureNumber(prefs.alertPopupInterval, 0);

  if (prefs.checkInterval < 1) {
    prefs.checkInterval = 1;
  }
  if (prefs.reminderInterval > 0 && prefs.reminderInterval < 5) {
    prefs.reminderInterval = 5;
  }
}

// ─── Timers ──────────────────────────────────────────────────────────

function stopTimers() {
  if (newEventsTimer) clearInterval(newEventsTimer);
  if (remindersTimer) clearInterval(remindersTimer);
  if (popupTimer) clearInterval(popupTimer);
}

function startMonitor() {
  stopTimers();
  checkForNewMessages();
  newEventsTimer = setInterval(checkForNewMessages, prefs.checkInterval * 1000);
  if (prefs.reminderInterval > 0) {
    remindersTimer = setInterval(notifyReminders, prefs.reminderInterval * 1000);
  }
  if (prefs.alertPopupInterval > 0) {
    popupTimer = setInterval(checkPeriodicPopup, 1000);
  }
}

function onGotPrefs(loadedPrefs) {
  log("onGotPrefs:", loadedPrefs);
  setNewPrefs(loadedPrefs);
  startMonitor();
}

function getPrefsAndStart() {
  browser.storage.local.get().then(onGotPrefs, (err) => log("Error loading prefs:", err));
}

function resetState() {
  state.monitoredCount = 0;
  state.otherCount = 0;
  state.remindersCount = 0;
  state.chatCount = 0;
  state.lastNotificationTime = 0;
  restoreOriginalOwaIcon();
  restoreInitialDocumentTitle();
}

function onPrefChanged(changes, area) {
  log("onPrefChanged:", changes);
  resetState();
  getPrefsAndStart();
}
