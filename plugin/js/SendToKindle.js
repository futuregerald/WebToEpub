"use strict";

class SendToKindle { // eslint-disable-line no-unused-vars
    static blobToBase64(blob) {
        return new Promise(function(resolve, reject) {
            let reader = new FileReader();
            reader.onloadend = function() {
                let dataUrl = reader.result;
                // dataUrl is "data:<mime>;base64,<data>" - extract just the base64 part
                let base64 = dataUrl.split(",")[1] || "";
                resolve(base64);
            };
            reader.onerror = function() {
                reject(reader.error);
            };
            reader.readAsDataURL(blob);
        });
    }

    static async send(blob, fileName) {
        let base64;
        try {
            base64 = await SendToKindle.blobToBase64(blob);
        } catch (err) {
            console.warn("SendToKindle: failed to convert blob to base64", err);
            return;
        }

        try {
            await chrome.storage.session.setAccessLevel({
                accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS"
            });
            await chrome.storage.session.set({
                kindleUpload: { base64, fileName }
            });
        } catch (err) {
            console.warn("SendToKindle: storage error (file may be too large)", err);
            return;
        }

        try {
            await chrome.scripting.registerContentScripts([{
                id: "sendToKindleContent",
                matches: ["https://www.amazon.com/sendtokindle*"],
                js: ["js/SendToKindleContent.js"],
                runAt: "document_idle",
                persistAcrossSessions: false
            }]);
        } catch (err) {
            // Script may already be registered from a previous attempt
            if (!err.message.includes("already registered")) {
                console.warn("SendToKindle: failed to register content script", err);
            }
        }

        await chrome.tabs.create({ url: "https://www.amazon.com/sendtokindle" });
    }
}
