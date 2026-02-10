"use strict";

function saveOptions(e) {
  e.preventDefault();
  console.log("Saving options...");

  const settings = {
    delayBetweenChecks: document.getElementById("delayBetweenChecks").valueAsNumber,
    delayBetweenReminders: document.getElementById("delayBetweenReminders").valueAsNumber,
    disableNotifications: document.getElementById("disableNotifications").checked,
    updateFavIcon: document.getElementById("updateFavIcon").checked,
    favIconColor: document.getElementById("favIconColor").value,
    updateDocumentTitle: document.getElementById("updateDocumentTitle").checked,
    monitoredFolders: document.getElementById("monitoredFolders").value, // Hidden input value
    cssForUnreadEmailsDetection: document.getElementById("cssForUnreadEmailsDetection").value,
    cssForVisibleRemindersDetection: document.getElementById("cssForVisibleRemindersDetection").value,
    cssForChatNotificationsDetection: document.getElementById("cssForChatNotificationsDetection").value
  };

  browser.storage.local.set(settings).then(() => {
    console.log("Options saved:", settings);
    const btn = document.querySelector("button[type='submit']");
    const originalText = btn.textContent;
    btn.textContent = "Saved!";
    setTimeout(() => {
      btn.textContent = originalText;
    }, 1500);
  }, (error) => {
    console.error("Error saving options:", error);
    alert("Error saving settings: " + error.message);
  });
}

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
    document.getElementById("delayBetweenChecks").value = defaultVal(prefs.delayBetweenChecks, 60);
    document.getElementById("delayBetweenReminders").value = defaultVal(prefs.delayBetweenReminders, 300);
    document.getElementById("disableNotifications").checked = defaultVal(prefs.disableNotifications, false);
    document.getElementById("updateFavIcon").checked = defaultVal(prefs.updateFavIcon, true);
    document.getElementById("favIconColor").value = defaultVal(prefs.favIconColor, "#FF8000");
    document.getElementById("updateDocumentTitle").checked = defaultVal(prefs.updateDocumentTitle, true);
    document.getElementById("monitoredFolders").value = defaultVal(prefs.monitoredFolders, "");

    // Initialize tags from saved value
    initializeTags();

    setCss("cssForUnreadEmailsDetection", "selectCssForUnreadEmailsDetection", prefs.cssForUnreadEmailsDetection);
    setCss("cssForVisibleRemindersDetection", "selectCssForVisibleRemindersDetection", prefs.cssForVisibleRemindersDetection);
    setCss("cssForChatNotificationsDetection", "selectCssForChatNotificationsDetection", prefs.cssForChatNotificationsDetection);
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
  span.innerHTML = label;
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
// -----------------------

function dropdownChange() {
  const txtInput = this.nextElementSibling;
  txtInput.value = this.value;
  (this.selectedIndex === 0) ? hide(txtInput) : show(txtInput);
  if (this.selectedIndex === 1) {
    txtInput.focus();
  }
}

document.addEventListener("DOMContentLoaded", function () {
  restoreOptions();
});
document.querySelector("form").addEventListener("submit", saveOptions);
document.getElementById("selectCssForUnreadEmailsDetection").addEventListener("change", dropdownChange);
document.getElementById("selectCssForVisibleRemindersDetection").addEventListener("change", dropdownChange);
document.getElementById("selectCssForChatNotificationsDetection").addEventListener("change", dropdownChange);


