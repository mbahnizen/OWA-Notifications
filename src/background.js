"use strict";

const DEBUG = false;
const log = DEBUG ? console.log.bind(console) : () => {};

const notifIcons = {
  "email": browser.runtime.getURL("email-alert.png"),
  "reminder": browser.runtime.getURL("calendar-alert.png"),
  "chat": browser.runtime.getURL("chat-alert.png")
};

browser.runtime.onMessage.addListener(notif => {
  log("received onMessage on background script:", notif);
  browser.notifications.create({
    "type": "basic",
    "iconUrl": notifIcons[notif.type],
    "title": "OWA Notification",
    "message": notif.msg
  }).catch(err => log("Notification error:", err));
});
