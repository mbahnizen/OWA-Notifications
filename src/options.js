"use strict";

let saveTimeout;

function saveOptions() {
  console.log("Autosaving options...");

  const getNum = (id, def) => {
    const el = document.getElementById(id);
    if (!el) return def;
    const val = el.valueAsNumber;
    return isNaN(val) ? def : val;
  };

  const settings = {
    checkInterval: 1, // Enforced
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
    // Show Saved Status
    const status = document.getElementById("saveStatus");
    if (status) {
      status.style.opacity = "1";
      status.textContent = "Saved";
      setTimeout(() => {
        status.style.opacity = "0";
      }, 1500);
    }
  }, (error) => {
    console.error("Error saving options:", error);
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

// ... helper functions (defaultVal, hide, show, setCss, restoreOptions) remain same ...
// ... tag logic remains same ...

// Modify restoreOptions to NOT overwrite user input if they are typing? 
// Actually restoreOptions is only called on load. So safe.

// New Event Listeners
document.addEventListener("DOMContentLoaded", function () {
  restoreOptions();

  // Attach Autosave Listeners
  const inputs = document.querySelectorAll("input, select, textarea");
  inputs.forEach(input => {
    if (input.type === "hidden") return; // Monitored folders hidden input handled by tag logic

    // For text/numbers, use input with debounce
    if (input.type === "text" || input.type === "number" || input.tagName === "TEXTAREA") {
      input.addEventListener("input", debounceSave);
    } else {
      // Checkboxes, Selects, Color pickers -> Change (Immediate)
      input.addEventListener("change", saveOptions);
    }
  });

  // Special case for monitoredFolders hidden input observers?
  // We need to trigger save when tags change.
  // We can modify createTag/addTag to call saveOptions.
  // Or easier:
  // Watch for mutations on the hidden input? No, values don't trigger mutation events.
  // We'll update the tag logic to call saveOptions().
});

// Dropdown logic needs to trigger save too
function dropdownChange() {
  const txtInput = this.nextElementSibling;
  txtInput.value = this.value;
  (this.selectedIndex === 0) ? hide(txtInput) : show(txtInput);
  if (this.selectedIndex === 1) {
    txtInput.focus();
  }
  saveOptions(); // Trigger save on dropdown change
}

// We need to hook into tag addition/removal
// We will modify the restoreOptions to attach listeners is cleaner, but we are replacing the bottom of the file.
// Let's replace the bottom event listeners part.

document.getElementById("selectCssForUnreadEmailsDetection").addEventListener("change", dropdownChange);
document.getElementById("selectCssForVisibleRemindersDetection").addEventListener("change", dropdownChange);
document.getElementById("selectCssForChatNotificationsDetection").addEventListener("change", dropdownChange);

// Observe hidden input for changes? 
// Actually, earlier code: removeTag/addTag/clearTag logic modifies hiddenInput.
// We should update those functions to call saveOptions().
// Use a MutationObserver on the hidden input? value attribute doesn't mutate DOM unless setAttribute is used.
// Let's patch addTag/remove listener.


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

function restoreOptions() {
  browser.storage.local.get().then((prefs) => {
    // Migration: Check for old keys if new keys are missing
    let checkInt = defaultVal(prefs.checkInterval, prefs.delayBetweenChecks);
    let remindInt = defaultVal(prefs.reminderInterval, prefs.delayBetweenReminders);

    // Enforce 1s in UI even if storage has other value
    document.getElementById("checkInterval").value = 1;
    document.getElementById("reminderInterval").value = defaultVal(remindInt, 300);
    document.getElementById("disableNotifications").checked = defaultVal(prefs.disableNotifications, false);
    document.getElementById("updateFavIcon").checked = defaultVal(prefs.updateFavIcon, true);
    document.getElementById("favIconColor").value = defaultVal(prefs.favIconColor, "#FF8000");
    document.getElementById("updateDocumentTitle").checked = defaultVal(prefs.updateDocumentTitle, true);
    document.getElementById("monitoredFolders").value = defaultVal(prefs.monitoredFolders, "");
    document.getElementById("notificationCooldown").value = defaultVal(prefs.notificationCooldown, 60);

    // Initialize tags from saved value
    initializeTags();

    document.getElementById("alertPopupInterval").value = defaultVal(prefs.alertPopupInterval, 0);
    setCss("cssForUnreadEmailsDetection", "selectCssForUnreadEmailsDetection", prefs.cssForUnreadEmailsDetection);
    setCss("cssForVisibleRemindersDetection", "selectCssForVisibleRemindersDetection", prefs.cssForVisibleRemindersDetection);
    setCss("cssForChatNotificationsDetection", "selectCssForChatNotificationsDetection", prefs.cssForChatNotificationsDetection);

    // Run initial checks
    updatePeriodicSummaryState();
  }, console.error);
}

// --- Tag Input Logic ---
const startTags = []; // unused, we read from hidden input
const tagContainer = document.getElementById("tagContainer");
const tagInput = document.getElementById("monitoredFoldersInput");
const hiddenInput = document.getElementById("monitoredFolders");

function createTag(label) {
  const div = document.createElement("div");
  div.setAttribute("class", "tag");
  const span = document.createElement("span");
  span.textContent = label;
  const closeBtn = document.createElement("span");
  closeBtn.setAttribute("class", "close-btn");
  closeBtn.innerHTML = "×"; // &times;
  closeBtn.addEventListener("click", function () {
    const value = hiddenInput.value;
    const tags = value.split(",").filter(s => s);
    const index = tags.indexOf(label);
    if (index > -1) {
      tags.splice(index, 1);
      hiddenInput.value = tags.join(",");
      renderTags();
      saveOptions(); // Autosave on remove
    }
  });
  div.appendChild(span);
  div.appendChild(closeBtn);
  return div;
}

function renderTags() {
  // Clear container but keep input
  tagContainer.innerHTML = "";
  const value = hiddenInput.value;
  const tags = value.split(",").filter(s => s && s.trim() !== "");

  tags.slice().reverse().forEach(tag => {
    // Ensure we render trimmed tags
    if (tag.trim()) {
      tagContainer.prepend(createTag(tag.trim()));
    }
  });

  tagContainer.appendChild(tagInput);
  updateDetectedChipsState();
  updatePeriodicSummaryState();
}

function addTag(text) {
  const cleanText = text.trim();
  if (cleanText === "") return;

  // Split by comma in case of paste
  const parts = cleanText.split(",");

  parts.forEach(part => {
    const finalText = part.trim();
    if (finalText === "") return;

    const value = hiddenInput.value;
    const tags = value.split(",").filter(s => s && s.trim() !== "");

    // Case-insensitive check to avoid duplicates
    const exists = tags.some(tag => tag.toLowerCase() === finalText.toLowerCase());

    if (exists) {
      return;
    }

    tags.push(finalText);
    hiddenInput.value = tags.join(",");
  });

  renderTags();
  tagInput.value = "";
  saveOptions(); // Autosave on add
}

function initializeTags() {
  renderTags();
}

tagInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter" || e.key === ",") {
    e.preventDefault();
    addTag(tagInput.value);
  } else if (e.key === "Backspace" && tagInput.value === "") {
    const value = hiddenInput.value;
    const tags = value.split(",").filter(s => s && s.trim() !== "");
    if (tags.length > 0) {
      tags.pop();
      hiddenInput.value = tags.join(",");
      renderTags();
    }
  }
});

// --- Folder Scanning Logic ---
const scanBtn = document.getElementById("scanFoldersBtn");
const detectedContainer = document.getElementById("detectedFolders");

async function performScan(isAuto = false) {
  if (!isAuto) {
    scanBtn.textContent = "Scanning...";
    scanBtn.disabled = true;
    detectedContainer.textContent = "Scanning..."; // Show feedback
  } else {
    // For auto-scan, maybe a subtle loading or just keep existing content until ready?
    // User wants seamless.
    if (detectedContainer.innerHTML === "") {
      detectedContainer.innerHTML = "<em style='color:gray'>Detecting folders...</em>";
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
        detectedContainer.textContent = ""; // Silent fail on auto
      }
      return;
    }

    const response = await browser.tabs.sendMessage(tabs[0].id, { cmd: "CMD_SCAN_FOLDERS" });

    if (response && response.result) {
      const { favorites, others } = response.result;

      // CRITICAL UPDATE: Do NOT filter out existing tags here.
      // We render ALL detected folders so they can be toggled by updateDetectedChipsState.

      if (favorites.length > 0 || others.length > 0) {
        renderDetectedFolders(favorites, others);
      } else {
        detectedContainer.textContent = "No specific folders found.";
      }
    } else {
      detectedContainer.textContent = "No folders detected. Try navigating to Mail view.";
    }

  } catch (error) {
    console.error("Scan failed", error);
    if (!isAuto) detectedContainer.textContent = "Error scanning: " + error.message;
  } finally {
    scanBtn.innerHTML = "<span>🔄</span> Refresh Folders";
    scanBtn.disabled = false;
  }
}

scanBtn.addEventListener("click", () => performScan(false));

const clearBtn = document.getElementById("clearTagsBtn");
clearBtn.addEventListener("click", function () {
  if (confirm("Are you sure you want to clear all monitored folders?")) {
    hiddenInput.value = "";
    renderTags();
  }
});

function renderDetectedFolders(favorites, others) {
  detectedContainer.innerHTML = "";

  const createSection = (title, folders, isFavorite) => {
    if (!folders || folders.length === 0) return;

    const headerDiv = document.createElement("div");
    headerDiv.className = "detected-section-header";

    const titleSpan = document.createElement("span");
    titleSpan.className = "title";
    titleSpan.textContent = title;
    headerDiv.appendChild(titleSpan);

    // Add "Monitor All Favorites" button inline if it's the Favorites section
    if (isFavorite && folders.length > 0) {
      const addAllBtn = document.createElement("button");
      addAllBtn.id = "monitorAllFavsBtn"; // Add ID for syncing
      addAllBtn.className = "secondary-btn btn-sm";
      // Text and state will be set by updateDetectedChipsState
      addAllBtn.type = "button";
      addAllBtn.onclick = function () {
        folders.forEach(f => addTag(f));
        // No need to manually update state here, addTag triggers renderTags -> updateDetectedChipsState
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
      chip.dataset.folder = f; // Store name for syncing
      chip.title = "Click to add to Monitored Folders";

      chip.addEventListener("click", function () {
        addTag(f);
      });
      list.appendChild(chip);
    });
    detectedContainer.appendChild(list);
  };

  createSection("Favorites", favorites, true);
  createSection("Other Folders", others, false);

  // Set initial state
  updateDetectedChipsState();
}

function updateDetectedChipsState() {
  const currentTags = hiddenInput.value.split(",").map(t => t.trim().toLowerCase()).filter(s => s);
  const chips = document.querySelectorAll(".detected-chip");

  // Track favorites for button state
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
      // Is monitored
      chip.style.opacity = "0.5";
      chip.style.pointerEvents = "none";
      if (!chip.textContent.includes("✓")) {
        chip.textContent = folderName + " ✓";
      }
    } else {
      // Is NOT monitored (available)
      chip.style.opacity = "1";
      chip.style.pointerEvents = "auto";
      chip.textContent = folderName;
    }
  });

  // Update "Monitor All Favorites" button
  const allFavsBtn = document.getElementById("monitorAllFavsBtn");
  if (allFavsBtn) {
    if (unmonitoredFavoritesCount > 0) {
      allFavsBtn.textContent = `Monitor All Favorites (${unmonitoredFavoritesCount})`;
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
  const foldersVal = hiddenInput.value;
  const hasFolders = foldersVal && foldersVal.trim().length > 0;
  const alertSelect = document.getElementById("alertPopupInterval");

  if (!hasFolders) {
    // Empty: Disable and set to 0
    if (alertSelect.value !== "0") {
      alertSelect.value = "0";
      alertSelect.dispatchEvent(new Event('change')); // Trigger autosave
    }
    alertSelect.disabled = true;
    alertSelect.title = "Add Monitored Folders first to enable this feature.";
  } else {
    // Has folders: Enable
    alertSelect.disabled = false;
    alertSelect.title = "";

    // Smart Default: If it was 0, set to 5
    if (alertSelect.value === "0") {
      alertSelect.value = "5";
      alertSelect.dispatchEvent(new Event('change')); // Trigger autosave
    }
  }
}


// -----------------------

function dropdownChange() {
  const txtInput = this.nextElementSibling;
  txtInput.value = this.value;
  (this.selectedIndex === 0) ? hide(txtInput) : show(txtInput);
  if (this.selectedIndex === 1) {
    txtInput.focus();
  }
  saveOptions(); // Autosave on dropdown change
}

const resetBtn = document.getElementById("resetBtn");
resetBtn.addEventListener("click", function () {
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
      alertPopupInterval: 5, // Smart Default: 5 minutes (but will be disabled if empty)
      cssForUnreadEmailsDetection: "",
      cssForVisibleRemindersDetection: "",
      cssForChatNotificationsDetection: ""
    };

    browser.storage.local.set(defaultSettings).then(() => {
      alert("Settings have been reset to defaults.");
      restoreOptions();
    }, console.error);
  }
});

document.addEventListener("DOMContentLoaded", function () {
  restoreOptions();

  // Attach Autosave Listeners
  // We do this slightly delayed to ensure elements are ready/restored? 
  // Actually restoreOptions is async (storage.get). 
  // We should attach listeners immediately, but debounce will handle initial noise if any.
  // Ideally we attach AFTER restoreOptions sets values, but restoreOptions is async.
  // But purely attaching "input" listener is fine.

  const inputs = document.querySelectorAll("input, select, textarea");
  inputs.forEach(input => {
    if (input.type === "hidden") return;

    // For text/numbers, use input with debounce
    if (input.type === "text" || input.type === "number" || input.tagName === "TEXTAREA") {
      input.addEventListener("input", debounceSave);
    } else {
      // Checkboxes, Selects, Color pickers -> Change (Immediate)
      input.addEventListener("change", saveOptions);
    }
  });

  document.getElementById("selectCssForUnreadEmailsDetection").addEventListener("change", dropdownChange);
  document.getElementById("selectCssForVisibleRemindersDetection").addEventListener("change", dropdownChange);
  document.getElementById("selectCssForChatNotificationsDetection").addEventListener("change", dropdownChange);

  // Auto-scan on load
  performScan(true);
});
// Removed form submit listener as button is gone
