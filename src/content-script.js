"use strict";

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

getPrefsAndStart();

function createIconElement() {
  let icon = document.createElement("link");
  icon.rel = "icon";
  icon.type = "image/png";
  icon.sizes = "16x16";
  icon.href = generateTabIcon(0);
  return icon;
}

function getCurrentFavIcon() {
  let icons = document.head.querySelectorAll("link[rel*=icon]");
  let icon;
  if (icons.length > 0) {
    icon = icons[icons.length - 1];
  } else {
    icon = createIconElement();
  }
  return icon;
}

function generateTabIcon(number, colorOverride) {
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext("2d");
  // draw cliped circle (radius is bigger than canvas by 1px) - the effect is a
  // square with round corners
  ctx.fillStyle = colorOverride || prefs.favIconColor;
  ctx.beginPath();
  ctx.arc(8, 8, 9, 0, 2 * Math.PI);
  ctx.fill();
  // draw the number in center
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


function getCountsFromNodes(nodes) {
  let counts = [];
  if (nodes) {
    for (let i = nodes.length - 1; i >= 0; i--) {
      let folderName = getFolderName(nodes[i]);
      let count = extractNumber(nodes[i].innerHTML);
      if (count > 0) {
        counts.push({ name: folderName, count: count });
      }
    }
  }
  return counts;
}

// Removed getItemsWithActiveCount as it was only used for OWA 2013 legacy strategy

// Removed getCountsFromFolders as it was only used for OWA 2013 legacy strategy

function getFolderName(node) {
  // Strategy 1: Look for aria-labelledby and find the corresponding element (OWA 2013+)
  try {
    let container = node.closest('[role="treeitem"]');
    if (container) {
      let labelledBy = container.getAttribute("aria-labelledby");
      if (labelledBy) {
        // labelledBy is usually like "_ariaId_X.folder _ariaId_X.ucount"
        // we want the folder part.
        let ids = labelledBy.split(" ");
        for (let id of ids) {
          let elem = document.getElementById(id);
          if (elem && elem !== node) { // It's not the count node itself
            if (elem.title) return elem.title;
            if (elem.textContent) return elem.textContent;
          }
        }
      }

      // Strategy 2: Look for title in the container (User screenshot case)
      let titleSpan = container.querySelector("[title]");
      if (titleSpan) return titleSpan.title;
    }

    // Strategy 3: Traverse up and look for fldrnm (OWA 2010?)
    let curr = node;
    while (curr && curr.tagName !== "BODY") {
      if (curr.getAttribute("fldrnm")) return curr.getAttribute("fldrnm");
      if (curr.getAttribute("title") && curr !== node) return curr.getAttribute("title");
      curr = curr.parentElement;
    }
  } catch (e) {
    console.error("Error in getFolderName", e);
  }
  return null;
}

function shouldMonitor(folderName) {
  if (!prefs.monitoredFolders || prefs.monitoredFolders.trim() === "") {
    return true; // Monitor all if no preference set
  }

  if (!folderName) return false;

  const folders = prefs.monitoredFolders.split(",").map(s => s.trim().toLowerCase()).filter(s => s);
  const name = folderName.toLowerCase();

  return folders.some(f => name.includes(f));
}

function getOffice365CountsFromNodes(nodes) {
  return Array.from(nodes)
    .filter(e => e.textContent === 'unread' && e.offsetParent !== null)
    .map(e => {
      let countNode = e.previousSibling;
      let folderName = getFolderName(countNode);
      let count = parseInt(e.previousSibling.textContent, 10);
      return { name: folderName, count: isNaN(count) ? 0 : count };
    })
    .filter(item => item.count > 0);
}

function getUnreadFolders() {
  let nodes;
  const results = [];

  // Strategy 1: Modern OWA / Outlook (Treeitems) - Most robust for current version
  // Iterates over all treeitems (folders) and looks for name and count within them.
  const treeItems = document.querySelectorAll('[role="treeitem"]');
  if (treeItems.length > 0) {
    const uniqueFolders = new Map();
    treeItems.forEach(item => {
      // Find folder name
      let name = "";
      const folderSpan = item.querySelector('[id*=".folder"]');
      if (folderSpan && folderSpan.title) {
        name = folderSpan.title;
      } else {
        const titleSpan = item.querySelector('span[title]');
        if (titleSpan) name = titleSpan.title;
      }

      if (name) {
        // Find unread count
        let count = 0;
        // Try finding the specific unread count span (usually has id ending in .ucount)
        const ucountSpan = item.querySelector('[id*=".ucount"]');
        if (ucountSpan && ucountSpan.textContent) {
          const match = ucountSpan.textContent.match(/(\d+)/);
          if (match) count = parseInt(match[1]);
        }

        // Fallback: look for the count number directly in the badge div
        if (count === 0) {
          // The badge is often in a div with a specific class or near the name
          // Based on provided HTML: div._n_44 > span
          const badgeSpan = item.querySelector('div[class*="_n_44"] span, div[class*="ms-bg-color-neutralLighter"] span');
          if (badgeSpan && badgeSpan.textContent) {
            const match = badgeSpan.textContent.match(/(\d+)/);
            if (match) count = parseInt(match[1]);
          }
        }

        if (count > 0) {
          // Use Map to ensure unique names (deduplicates Favorites vs Tree)
          uniqueFolders.set(name, count);
        }
      }
    });

    // Convert Map back to array of objects
    uniqueFolders.forEach((count, name) => {
      results.push({ name: name, count: count });
    });

    return results;
  }

  // Legacy Strategies
  if (prefs.cssForUnreadEmailsDetection) {
    return getCountsFromNodes(document.querySelectorAll(prefs.cssForUnreadEmailsDetection));
  }

  // Removed OWA 2010/2013 support as per Refactoring Plan
  return [];
}

function countVisibleReminders() {
  let nodes;
  if (prefs.cssForVisibleRemindersDetection) {
    // custom css
    return getCountFromNodes(document.querySelectorAll(prefs.cssForVisibleRemindersDetection));
  }

  // Modern OWA / 365
  if ((nodes = document.querySelectorAll(".o365cs-notifications-notificationPopup .o365cs-notifications-notificationHeaderText")).length > 0) {
    // 365 new check
    return getCountFromNodes(nodes);
  }
  if ((nodes = document.querySelectorAll("[data-storybook=\"reminder\"]")).length > 0) {
    // outlook.live.com beta
    return nodes.length;
  }

  // Removed OWA 2010/2013/Old 365 selectors
  return 0;
}

function countChatNotifications() {
  if (prefs.cssForChatNotificationsDetection) {
    return getCountFromNodes(document.querySelectorAll(prefs.cssForChatNotificationsDetection));
  }
  // it finds twice the real number so split it by two
  return (document.querySelectorAll(".o365cs-notifications-chat-accept").length >> 1);
}


// popupTimer is now declared at top level state
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
  // Debug log to trace spamming issue
  // console.log("checkPeriodicPopup", prefs.alertPopupInterval, lastPopupTime); 

  if (typeof prefs.alertPopupInterval !== 'number' || prefs.alertPopupInterval <= 0) return;

  const now = Date.now();
  // Check if enough time passed (interval is in minutes)
  if (now - lastPopupTime < prefs.alertPopupInterval * 60 * 1000) return;

  const unreadFolders = getUnreadFolders();
  const monitoredFolders = unreadFolders.filter(f => shouldMonitor(f.name));

  if (monitoredFolders.length > 0) {
    // Build summary
    const summary = monitoredFolders.map(f => `${f.name}: ${f.count}`).join("\n");
    triggerNotification("email", "Unread Summary:\n" + summary);
  }

  // Update time regardless of whether we notified, to strictly respect the interval.
  // This prevents "Instant Summary" if an email arrives after a long quiet period.
  lastPopupTime = now;
}

function checkForNewMessages() {
  const allUnreadFolders = getUnreadFolders();

  // Split into Monitored vs Other
  const monitoredFolders = allUnreadFolders.filter(f => shouldMonitor(f.name));
  const otherFolders = allUnreadFolders.filter(f => !shouldMonitor(f.name));

  const currentMonitoredCount = monitoredFolders.reduce((acc, curr) => acc + curr.count, 0);
  const currentOtherCount = otherFolders.reduce((acc, curr) => acc + curr.count, 0);

  let newVisibleRemindersCount = countVisibleReminders();
  let newChatNotificationsCount = countChatNotifications();

  // Update Favicon
  if (prefs.updateFavIcon) {
    let totalCount = currentMonitoredCount + currentOtherCount + newVisibleRemindersCount + newChatNotificationsCount;
    // Determine color
    let color = prefs.favIconColor; // Default (Orange)
    if (currentMonitoredCount === 0 && currentOtherCount > 0) {
      color = "#0099FF"; // Blue for non-urgent
    }
    setFavicon(totalCount, color);
  }

  // Update Title
  if (prefs.updateDocumentTitle) {
    let countToShow = currentMonitoredCount > 0 ? currentMonitoredCount : currentOtherCount;
    setDocumentTitle(countToShow, newVisibleRemindersCount, newChatNotificationsCount);
  }

  // Notifications

  // 1. Monitored Folders (Priority, No Cooldown)
  if (currentMonitoredCount > state.monitoredCount) {
    const diff = currentMonitoredCount - state.monitoredCount;
    triggerNotification("email", buildEmailNotificationMessage(diff));
  }

  // 2. Other Folders (Respect Cooldown)
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

  // Periodic check
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

function scanFolders() {
  const favorites = new Set();
  const others = new Set();

  // Strategy 1: Treeitems (Modern OWA)
  // 1.a. Identifying Favorites Container
  // Based on inspect: id="MailFolderPane.FavoritesFolders" contains favorite items
  const favoritesContainer = document.getElementById("MailFolderPane.FavoritesFolders");

  const processItem = (item, set) => {
    let name = "";
    const folderSpan = item.querySelector('[id*=".folder"]');
    if (folderSpan && folderSpan.title) {
      name = folderSpan.title;
    } else {
      const titleSpan = item.querySelector('span[title]');
      // Avoid "Favorites" header itself if caught
      if (titleSpan) name = titleSpan.title;
    }

    if (name && name.trim().length > 0 && name !== "Favorites" && name !== "Folders") {
      set.add(name);
    }
  };

  const allTreeItems = document.querySelectorAll('[role="treeitem"]');
  allTreeItems.forEach(item => {
    // Check if this item is inside the favorites container
    if (favoritesContainer && favoritesContainer.contains(item)) {
      processItem(item, favorites);
    } else {
      processItem(item, others);
    }
  });

  // Fallback / Clean up if no container found but permissions/versions differ? 
  // For now rely on the ID as it seemed consistent in the user's HTML.

  // Note: users might have same folder name in both (e.g. Inbox), usually we want to distinguish?
  // But for monitoring, "Inbox" is just "Inbox" to the folder scanner?
  // Actually getUnreadFolders distinguishes logic by location, but the user just inputs the NAME.
  // The extension's `getUnreadFolders` scans *all* locations and matches by name.
  // So if "Inbox" is in Favorites AND in Folders, adding "Inbox" to monitored list will cover both technically 
  // (depending on how getUnreadFolders counts). 
  // Current getUnreadFolders iterates ALL treeitems. If "Inbox" appears twice (once in Fav, once in Tree),
  // it finds both. The `shouldMonitor` checks if name is in list. 
  // So adding "Inbox" once is enough.

  return {
    favorites: Array.from(favorites).sort(),
    others: Array.from(others).sort()
  };
}

// Message Listener from Options Page
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.cmd === "CMD_SCAN_FOLDERS") {
    // Returns { favorites: [], others: [] }
    const result = scanFolders();
    sendResponse({ result: result });
  }
});

function setNewPrefs(newPrefs) {
  prefs = newPrefs;

  const ensureNumber = (val, def) => {
    let n = parseFloat(val);
    return isNaN(n) ? def : n;
  };

  // set defaults with migration for old keys
  // First resolve the key migration
  let checkInt = (prefs.checkInterval !== undefined) ? prefs.checkInterval : prefs.delayBetweenChecks;
  prefs.checkInterval = 1; // Enforced 1s

  let remindInt = (prefs.reminderInterval !== undefined) ? prefs.reminderInterval : prefs.delayBetweenReminders;
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

function defaultVal(value, defaultValue) {
  return (typeof value === "undefined" || value === null) ? defaultValue : value;
}

function stopTimers() {
  if (newEventsTimer) {
    clearInterval(newEventsTimer);
  }
  if (remindersTimer) {
    clearInterval(remindersTimer);
  }
  if (popupTimer) {
    clearInterval(popupTimer);
  }
}

function startMonitor() {
  stopTimers();
  checkForNewMessages();
  newEventsTimer = setInterval(checkForNewMessages, prefs.checkInterval * 1000);
  if (prefs.reminderInterval > 0) {
    remindersTimer = setInterval(notifyReminders, prefs.reminderInterval * 1000);
  }
  // Check for periodic popup readiness frequently (every 1s)
  // The function itself checks if enough time has passed.
  if (prefs.alertPopupInterval > 0) {
    popupTimer = setInterval(checkPeriodicPopup, 1000);
  }
}

function onGotPrefs(prefs) {
  console.log("onGotPrefs: ", prefs);
  setNewPrefs(prefs);
  startMonitor();
}

function getPrefsAndStart() {
  browser.storage.local.get().then(onGotPrefs, console.error);
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
  console.log("onPrefChanged: ", changes);
  resetState();
  getPrefsAndStart();
}
