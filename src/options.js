"use strict";

// ─── Debug Flag ──────────────────────────────────────────────────────
const DEBUG = false;
const log = DEBUG ? console.log.bind(console) : () => {};

// ─── Utility Functions ───────────────────────────────────────────────

let saveTimeout;

function defaultVal(value, defaultValue) {
  return (typeof value === "undefined") ? defaultValue : value;
}

function hide(e) {
  e.style.display = "none";
}

function show(e) {
  e.style.display = "block";
}

function setCss(txtInputId, selectId, value) {
  const val = defaultVal(value, "").trim();
  const select = document.getElementById(selectId);
  select.value = val;
  if (select.selectedIndex === -1) {
    select.selectedIndex = 1;
  }
  const txtInput = document.getElementById(txtInputId);
  txtInput.value = val;
  if (select.selectedIndex === 0) {
    hide(txtInput);
  }
}

// ─── Save / Restore ──────────────────────────────────────────────────

function saveOptions() {
  log("Autosaving options...");

  const getNum = (id, def) => {
    const el = document.getElementById(id);
    if (!el) return def;
    const val = el.valueAsNumber;
    return isNaN(val) ? def : val;
  };

  const settings = {
    checkInterval: 1,
    reminderInterval: getNum("reminderInterval", 300),
    disableNotifications: document.getElementById("disableNotifications").checked,
    updateFavIcon: document.getElementById("updateFavIcon").checked,
    favIconColor: document.getElementById("favIconColor").value,
    updateDocumentTitle: document.getElementById("updateDocumentTitle").checked,
    monitoredFolders: document.getElementById("monitoredFolders").value,
    notificationCooldown: getNum("notificationCooldown", 60),
    cssForUnreadEmailsDetection: document.getElementById("cssForUnreadEmailsDetection").value,
    cssForVisibleRemindersDetection: document.getElementById("cssForVisibleRemindersDetection").value,
    cssForChatNotificationsDetection: document.getElementById("cssForChatNotificationsDetection").value,
    alertPopupInterval: document.getElementById("alertPopupInterval").value
  };

  browser.storage.local.set(settings).then(() => {
    const status = document.getElementById("saveStatus");
    if (status) {
      status.style.opacity = "1";
      status.textContent = "Saved";
      setTimeout(() => {
        status.style.opacity = "0";
      }, 1500);
    }
  }, (error) => {
    log("Error saving options:", error);
    const status = document.getElementById("saveStatus");
    if (status) {
      status.style.opacity = "1";
      status.style.color = "red";
      status.textContent = "Error saving!";
    }
  });
}

function debounceSave() {
  const status = document.getElementById("saveStatus");
  if (status) {
    status.style.opacity = "1";
    status.textContent = "Saving...";
  }

  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveOptions, 500);
}

function restoreOptions() {
  browser.storage.local.get().then((prefs) => {
    const remindInt = defaultVal(prefs.reminderInterval, prefs.delayBetweenReminders);

    document.getElementById("checkInterval").value = 1;
    document.getElementById("reminderInterval").value = defaultVal(remindInt, 300);
    document.getElementById("disableNotifications").checked = defaultVal(prefs.disableNotifications, false);
    document.getElementById("updateFavIcon").checked = defaultVal(prefs.updateFavIcon, true);
    document.getElementById("favIconColor").value = defaultVal(prefs.favIconColor, "#FF8000");
    document.getElementById("updateDocumentTitle").checked = defaultVal(prefs.updateDocumentTitle, true);
    document.getElementById("monitoredFolders").value = defaultVal(prefs.monitoredFolders, "");
    document.getElementById("notificationCooldown").value = defaultVal(prefs.notificationCooldown, 60);

    initializeTags();

    document.getElementById("alertPopupInterval").value = defaultVal(prefs.alertPopupInterval, 0);
    setCss("cssForUnreadEmailsDetection", "selectCssForUnreadEmailsDetection", prefs.cssForUnreadEmailsDetection);
    setCss("cssForVisibleRemindersDetection", "selectCssForVisibleRemindersDetection", prefs.cssForVisibleRemindersDetection);
    setCss("cssForChatNotificationsDetection", "selectCssForChatNotificationsDetection", prefs.cssForChatNotificationsDetection);

    updatePeriodicSummaryState();
  }, (err) => log("Error restoring options:", err));
}

// ─── Dropdown Change Handler ─────────────────────────────────────────

function dropdownChange() {
  const txtInput = this.nextElementSibling;
  txtInput.value = this.value;
  (this.selectedIndex === 0) ? hide(txtInput) : show(txtInput);
  if (this.selectedIndex === 1) {
    txtInput.focus();
  }
  saveOptions();
}

// ─── Tag Input Logic ─────────────────────────────────────────────────

function createTag(label, hiddenInput, tagContainer, tagInput) {
  const div = document.createElement("div");
  div.setAttribute("class", "tag");

  const span = document.createElement("span");
  span.textContent = label;

  const closeBtn = document.createElement("span");
  closeBtn.setAttribute("class", "close-btn");
  closeBtn.textContent = "\u00D7"; // × character
  closeBtn.addEventListener("click", function () {
    const value = hiddenInput.value;
    const tags = value.split(",").filter(s => s);
    const index = tags.indexOf(label);
    if (index > -1) {
      tags.splice(index, 1);
      hiddenInput.value = tags.join(",");
      renderTags(hiddenInput, tagContainer, tagInput);
      saveOptions();
    }
  });

  div.appendChild(span);
  div.appendChild(closeBtn);
  return div;
}

function renderTags(hiddenInput, tagContainer, tagInput) {
  // Clear container
  while (tagContainer.firstChild) {
    tagContainer.removeChild(tagContainer.firstChild);
  }

  const value = hiddenInput.value;
  const tags = value.split(",").filter(s => s && s.trim() !== "");

  tags.slice().reverse().forEach(tag => {
    if (tag.trim()) {
      tagContainer.prepend(createTag(tag.trim(), hiddenInput, tagContainer, tagInput));
    }
  });

  tagContainer.appendChild(tagInput);
  updateDetectedChipsState(hiddenInput);
  updatePeriodicSummaryState();
}

function addTag(text, hiddenInput, tagContainer, tagInput) {
  const cleanText = text.trim();
  if (cleanText === "") return;

  const parts = cleanText.split(",");

  parts.forEach(part => {
    const finalText = part.trim();
    if (finalText === "") return;

    const value = hiddenInput.value;
    const tags = value.split(",").filter(s => s && s.trim() !== "");

    const exists = tags.some(tag => tag.toLowerCase() === finalText.toLowerCase());
    if (exists) return;

    tags.push(finalText);
    hiddenInput.value = tags.join(",");
  });

  renderTags(hiddenInput, tagContainer, tagInput);
  tagInput.value = "";
  saveOptions();
}

function initializeTags() {
  const hiddenInput = document.getElementById("monitoredFolders");
  const tagContainer = document.getElementById("tagContainer");
  const tagInput = document.getElementById("monitoredFoldersInput");
  renderTags(hiddenInput, tagContainer, tagInput);
}

// ─── Folder Scanning Logic ───────────────────────────────────────────

async function performScan(isAuto = false) {
  const scanBtn = document.getElementById("scanFoldersBtn");
  const detectedContainer = document.getElementById("detectedFolders");

  if (!isAuto) {
    scanBtn.textContent = "Scanning...";
    scanBtn.disabled = true;
    detectedContainer.textContent = "Scanning...";
  } else {
    if (detectedContainer.textContent === "") {
      const em = document.createElement("em");
      em.style.color = "gray";
      em.textContent = "Detecting folders...";
      detectedContainer.appendChild(em);
    }
  }

  try {
    const allTabs = await browser.tabs.query({});
    const tabs = allTabs.filter(tab => {
      const u = (tab.url || "").toLowerCase();
      return u.includes("/owa/") ||
        u.includes("outlook.live.com") ||
        u.includes("outlook.office365.com") ||
        u.includes("outlook.office.com");
    });

    if (tabs.length === 0) {
      if (!isAuto) {
        detectedContainer.textContent = "No OWA/Outlook tab found. Please open Outlook Web App first.";
      } else {
        detectedContainer.textContent = "";
      }
      return;
    }

    const response = await browser.tabs.sendMessage(tabs[0].id, { cmd: "CMD_SCAN_FOLDERS" });

    if (response && response.result) {
      const { favorites, others } = response.result;

      if (favorites.length > 0 || others.length > 0) {
        renderDetectedFolders(favorites, others);
      } else {
        detectedContainer.textContent = "No specific folders found.";
      }
    } else {
      detectedContainer.textContent = "No folders detected. Try navigating to Mail view.";
    }

  } catch (error) {
    log("Scan failed", error);
    if (!isAuto) detectedContainer.textContent = "Error scanning: " + error.message;
  } finally {
    // Reset button using safe DOM APIs
    while (scanBtn.firstChild) {
      scanBtn.removeChild(scanBtn.firstChild);
    }
    const iconSpan = document.createElement("span");
    iconSpan.textContent = "\uD83D\uDD04"; // 🔄
    scanBtn.appendChild(iconSpan);
    scanBtn.appendChild(document.createTextNode(" Refresh Folders"));
    scanBtn.disabled = false;
  }
}

function renderDetectedFolders(favorites, others) {
  const detectedContainer = document.getElementById("detectedFolders");
  const hiddenInput = document.getElementById("monitoredFolders");
  const tagContainer = document.getElementById("tagContainer");
  const tagInput = document.getElementById("monitoredFoldersInput");

  // Clear container safely
  while (detectedContainer.firstChild) {
    detectedContainer.removeChild(detectedContainer.firstChild);
  }

  const createSection = (title, folders, isFavorite) => {
    if (!folders || folders.length === 0) return;

    const headerDiv = document.createElement("div");
    headerDiv.className = "detected-section-header";

    const titleSpan = document.createElement("span");
    titleSpan.className = "title";
    titleSpan.textContent = title;
    headerDiv.appendChild(titleSpan);

    if (isFavorite && folders.length > 0) {
      const addAllBtn = document.createElement("button");
      addAllBtn.id = "monitorAllFavsBtn";
      addAllBtn.className = "secondary-btn btn-sm";
      addAllBtn.type = "button";
      addAllBtn.onclick = function () {
        folders.forEach(f => addTag(f, hiddenInput, tagContainer, tagInput));
      };
      headerDiv.appendChild(addAllBtn);
    }

    detectedContainer.appendChild(headerDiv);

    const list = document.createElement("div");
    list.className = "detected-list";

    folders.forEach(f => {
      const chip = document.createElement("span");
      chip.className = "detected-chip" + (isFavorite ? " favorite" : "");
      chip.textContent = f;
      chip.dataset.folder = f;
      chip.title = "Click to add to Monitored Folders";

      chip.addEventListener("click", function () {
        addTag(f, hiddenInput, tagContainer, tagInput);
      });
      list.appendChild(chip);
    });
    detectedContainer.appendChild(list);
  };

  createSection("Favorites", favorites, true);
  createSection("Other Folders", others, false);

  updateDetectedChipsState(hiddenInput);
}

function updateDetectedChipsState(hiddenInput) {
  if (!hiddenInput) {
    hiddenInput = document.getElementById("monitoredFolders");
  }
  const currentTags = hiddenInput.value.split(",").map(t => t.trim().toLowerCase()).filter(s => s);
  const chips = document.querySelectorAll(".detected-chip");

  let unmonitoredFavoritesCount = 0;

  chips.forEach(chip => {
    const folderName = chip.dataset.folder;
    if (!folderName) return;

    const isMonitored = currentTags.includes(folderName.toLowerCase());
    const isFavorite = chip.classList.contains("favorite");

    if (isFavorite && !isMonitored) {
      unmonitoredFavoritesCount++;
    }

    if (isMonitored) {
      chip.style.opacity = "0.5";
      chip.style.pointerEvents = "none";
      chip.textContent = folderName + " \u2713"; // ✓
    } else {
      chip.style.opacity = "1";
      chip.style.pointerEvents = "auto";
      chip.textContent = folderName;
    }
  });

  const allFavsBtn = document.getElementById("monitorAllFavsBtn");
  if (allFavsBtn) {
    if (unmonitoredFavoritesCount > 0) {
      allFavsBtn.textContent = "Monitor All Favorites (" + unmonitoredFavoritesCount + ")";
      allFavsBtn.disabled = false;
      allFavsBtn.style.opacity = "1";
    } else {
      allFavsBtn.textContent = "Added!";
      allFavsBtn.disabled = true;
      allFavsBtn.style.opacity = "0.7";
    }
  }
}

function updatePeriodicSummaryState() {
  const hiddenInput = document.getElementById("monitoredFolders");
  if (!hiddenInput) return;

  const foldersVal = hiddenInput.value;
  const hasFolders = foldersVal && foldersVal.trim().length > 0;
  const alertSelect = document.getElementById("alertPopupInterval");
  if (!alertSelect) return;

  if (!hasFolders) {
    if (alertSelect.value !== "0") {
      alertSelect.value = "0";
      alertSelect.dispatchEvent(new Event('change'));
    }
    alertSelect.disabled = true;
    alertSelect.title = "Add Monitored Folders first to enable this feature.";
  } else {
    alertSelect.disabled = false;
    alertSelect.title = "";

    if (alertSelect.value === "0") {
      alertSelect.value = "5";
      alertSelect.dispatchEvent(new Event('change'));
    }
  }
}

// ─── Initialization (Single DOMContentLoaded) ────────────────────────

document.addEventListener("DOMContentLoaded", function () {
  // Restore saved options
  restoreOptions();

  // Attach autosave listeners to all inputs
  const inputs = document.querySelectorAll("input, select, textarea");
  inputs.forEach(input => {
    if (input.type === "hidden") return;

    if (input.type === "text" || input.type === "number" || input.tagName === "TEXTAREA") {
      input.addEventListener("input", debounceSave);
    } else {
      input.addEventListener("change", saveOptions);
    }
  });

  // Dropdown listeners
  document.getElementById("selectCssForUnreadEmailsDetection").addEventListener("change", dropdownChange);
  document.getElementById("selectCssForVisibleRemindersDetection").addEventListener("change", dropdownChange);
  document.getElementById("selectCssForChatNotificationsDetection").addEventListener("change", dropdownChange);

  // Tag input listeners
  const hiddenInput = document.getElementById("monitoredFolders");
  const tagContainer = document.getElementById("tagContainer");
  const tagInput = document.getElementById("monitoredFoldersInput");

  tagInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput.value, hiddenInput, tagContainer, tagInput);
    } else if (e.key === "Backspace" && tagInput.value === "") {
      const value = hiddenInput.value;
      const tags = value.split(",").filter(s => s && s.trim() !== "");
      if (tags.length > 0) {
        tags.pop();
        hiddenInput.value = tags.join(",");
        renderTags(hiddenInput, tagContainer, tagInput);
      }
    }
  });

  // Scan button
  document.getElementById("scanFoldersBtn").addEventListener("click", () => performScan(false));

  // Clear button
  document.getElementById("clearTagsBtn").addEventListener("click", function () {
    if (confirm("Are you sure you want to clear all monitored folders?")) {
      hiddenInput.value = "";
      renderTags(hiddenInput, tagContainer, tagInput);
    }
  });

  // Reset button
  document.getElementById("resetBtn").addEventListener("click", function () {
    if (confirm("WARNING: This will reset ALL settings to their default values. Your monitored folders list will be cleared.\n\nAre you sure?")) {
      const defaultSettings = {
        checkInterval: 1,
        reminderInterval: 300,
        disableNotifications: false,
        updateFavIcon: true,
        favIconColor: "#FF8000",
        updateDocumentTitle: true,
        monitoredFolders: "",
        notificationCooldown: 60,
        alertPopupInterval: 5,
        cssForUnreadEmailsDetection: "",
        cssForVisibleRemindersDetection: "",
        cssForChatNotificationsDetection: ""
      };

      browser.storage.local.set(defaultSettings).then(() => {
        alert("Settings have been reset to defaults.");
        restoreOptions();
      }, (err) => log("Error resetting:", err));
    }
  });

  // Auto-scan on load
  performScan(true);
});
