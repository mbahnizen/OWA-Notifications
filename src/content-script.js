"use strict";

let prefs = {
  favIconColor: "#0099FF"
};
let newEventsTimer, remindersTimer;
let unreadEmailsCount = 0;
let visibleRemindersCount = 0;
let chatNotificationsCount = 0;
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

function generateTabIcon(number) {
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext("2d");
  // draw cliped circle (radius is bigger than canvas by 1px) - the effect is a
  // square with round corners
  ctx.fillStyle = prefs.favIconColor;
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

function setFavicon(count) {
  const nr = Math.min(count, 99);
  if (nr) {
    owaIcon.href = generateTabIcon(nr);
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

function extractNumber(text) {
  if (text) {
    let digits = text.match(/\d/gi);
    if (digits) {
      return parseInt(digits.join(""), 10);
    }
  }
  return 0;
}

function getCountFromNodes(nodes) {
  let count = 0;
  if (nodes) {
    for (let i = nodes.length - 1; i >= 0; i--) {
      if (shouldMonitor(getFolderName(nodes[i]))) {
        count += extractNumber(nodes[i].innerHTML);
      }
    }
  }
  return count;
}

function getItemsWithActiveCount(folder) {
  return folder.querySelectorAll("[id*='.ucount']");
}

function getCountFromFolders(folders) {
  let count = 0;
  for (let i = folders.length - 1; i >= 0; i--) {
    count += getCountFromNodes(getItemsWithActiveCount(folders[i]));
  }
  return count;
}

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

  if (!folderName) return false; // If we can't determine folder name, safest is to ignore? Or include? 
  // Let's ignore to avoid false positives if the user specifically asked for filtering.

  const folders = prefs.monitoredFolders.split(",").map(s => s.trim().toLowerCase()).filter(s => s);
  const name = folderName.toLowerCase();

  return folders.some(f => name.includes(f));
}

function getOffice365CountFromNodes(nodes) {
  return Array.from(nodes)
    .filter(e => e.textContent === 'unread' && e.offsetParent !== null)
    .filter(e => {
      let countNode = e.previousSibling;
      let folderName = getFolderName(countNode);
      return shouldMonitor(folderName);
    })
    .map(e => parseInt(e.previousSibling.textContent, 10))
    .filter(v => !isNaN(v))
    .reduce((acc, curr) => { return acc + curr }, 0);
}

function countUnreadEmails() {
  let nodes;
  if (prefs.cssForUnreadEmailsDetection) {
    // custom css
    return getCountFromNodes(document.querySelectorAll(prefs.cssForUnreadEmailsDetection));
  }
  if ((nodes = document.querySelectorAll("#spnUC #spnCV")).length > 0) {
    // OWA 2010
    return getCountFromNodes(nodes);
  }
  if ((nodes = document.querySelectorAll("[aria-label='Folder Pane']")).length > 0) {
    // OWA 2013
    return getCountFromFolders(nodes);
  }
  if ((nodes = document.querySelectorAll("[title='Favorites'] ~ div > div > [title='Inbox'] span:nth-of-type(2) > span")).length > 0) {
    // outlook.live.com
    return getCountFromNodes(nodes);
  }
  if ((nodes = document.querySelectorAll("[title='Folders'] ~ div > [title='Inbox'] span:nth-of-type(2) > span")).length > 0) {
    // outlook.live.com Inbox not added to Favorites
    return getCountFromNodes(nodes);
  }
  if ((nodes = document.querySelectorAll("span span span.screenReaderOnly")).length > 0) {
    // Office365 owa
    return getOffice365CountFromNodes(nodes);
  }

  return 0;
}

function countVisibleReminders() {
  let nodes;
  if (prefs.cssForVisibleRemindersDetection) {
    // custom css
    return getCountFromNodes(document.querySelectorAll(prefs.cssForVisibleRemindersDetection));
  }
  if ((nodes = document.querySelectorAll("#spnRmT.alertBtnTxt")).length > 0) {
    // OWA 2010
    return extractNumber(nodes[0].innerHTML);
  }
  if ((nodes = document.querySelectorAll("[aria-label='New Notification']")).length > 2) {
    // OWA 2013
    return extractNumber(nodes[3].title);
  }
  if ((nodes = document.querySelectorAll(".o365cs-notifications-notificationPopup .o365cs-notifications-notificationHeaderText")).length > 0) {
    // 365 new check
    return getCountFromNodes(nodes);
  }
  if ((nodes = document.querySelectorAll(".o365cs-notifications-notificationCounter")).length > 0) {
    // 365 old check
    return extractNumber(nodes[0].innerHTML);
  }
  if ((nodes = document.querySelectorAll("[data-storybook=\"reminder\"]")).length > 0) {
    // outlook.live.com beta
    return nodes.length;
  }
  return 0;
}

function countChatNotifications() {
  if (prefs.cssForChatNotificationsDetection) {
    return getCountFromNodes(document.querySelectorAll(prefs.cssForChatNotificationsDetection));
  }
  // it finds twice the real number so split it by two
  return (document.querySelectorAll(".o365cs-notifications-chat-accept").length >> 1);
}

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

function checkForNewMessages() {
  let newUnreadEmailsCount = countUnreadEmails();
  let newVisibleRemindersCount = countVisibleReminders();
  let newChatNotificationsCount = countChatNotifications();
  let noChange = (newUnreadEmailsCount === unreadEmailsCount) && (newVisibleRemindersCount === visibleRemindersCount)
    && (newChatNotificationsCount === chatNotificationsCount);
  if (noChange) {
    return;
  }
  if (prefs.updateFavIcon) {
    setFavicon(newUnreadEmailsCount + newVisibleRemindersCount + newChatNotificationsCount);
  }
  if (prefs.updateDocumentTitle) {
    setDocumentTitle(newUnreadEmailsCount, newVisibleRemindersCount, newChatNotificationsCount);
  }
  if (newUnreadEmailsCount > unreadEmailsCount) {
    triggerNotification("email", buildEmailNotificationMessage(newUnreadEmailsCount - unreadEmailsCount));
  }
  if (newVisibleRemindersCount > visibleRemindersCount) {
    triggerNotification("reminder", buildReminderNotificationMessage(newVisibleRemindersCount - visibleRemindersCount));
  }
  if (newChatNotificationsCount > chatNotificationsCount) {
    triggerNotification("chat", "New chat " + singularOrPlural("notification", newChatNotificationsCount) + "!");
  }

  unreadEmailsCount = newUnreadEmailsCount;
  visibleRemindersCount = newVisibleRemindersCount;
  chatNotificationsCount = newChatNotificationsCount;
}

function notifyReminders() {
  if (visibleRemindersCount > 0) {
    triggerNotification("reminder", "You have " + visibleRemindersCount + " " + singularOrPlural("reminder", visibleRemindersCount));
  }
  if (chatNotificationsCount > 0) {
    triggerNotification("chat", "You have open chat " + singularOrPlural("notification", chatNotificationsCount));
  }
}

function setNewPrefs(newPrefs) {
  prefs = newPrefs;
  // set defaults
  prefs.delayBetweenChecks = defaultVal(prefs.delayBetweenChecks, 1) - 0;
  prefs.delayBetweenReminders = defaultVal(prefs.delayBetweenReminders, 300) - 0;
  prefs.disableNotifications = defaultVal(prefs.disableNotifications, false);
  prefs.updateFavIcon = defaultVal(prefs.updateFavIcon, true);
  prefs.favIconColor = defaultVal(prefs.favIconColor, "#0099FF");
  prefs.updateDocumentTitle = defaultVal(prefs.updateDocumentTitle, true);
  prefs.monitoredFolders = defaultVal(prefs.monitoredFolders, "");
  if (prefs.delayBetweenChecks < 1) {
    prefs.delayBetweenChecks = 1;
  }
  if (prefs.delayBetweenReminders > 0 && prefs.delayBetweenReminders < 5) {
    prefs.delayBetweenReminders = 5;
  }
}

function defaultVal(value, defaultValue) {
  return (typeof value === "undefined") ? defaultValue : value;
}

function stopTimers() {
  if (newEventsTimer) {
    clearInterval(newEventsTimer);
  }
  if (remindersTimer) {
    clearInterval(remindersTimer);
  }
}

function startMonitor() {
  stopTimers();
  checkForNewMessages();
  newEventsTimer = setInterval(checkForNewMessages, prefs.delayBetweenChecks * 1000);
  if (prefs.delayBetweenReminders > 0) {
    remindersTimer = setInterval(notifyReminders, prefs.delayBetweenReminders * 1000);
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
  unreadEmailsCount = 0;
  visibleRemindersCount = 0;
  chatNotificationsCount = 0;
  restoreOriginalOwaIcon();
  restoreInitialDocumentTitle();
}

function onPrefChanged(changes, area) {
  console.log("onPrefChanged: ", changes);
  resetState();
  getPrefsAndStart();
}
