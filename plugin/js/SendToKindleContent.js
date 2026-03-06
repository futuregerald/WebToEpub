"use strict";

class SendToKindleContent { // eslint-disable-line no-unused-vars
    static base64ToFile(base64, fileName) {
        let binaryString = atob(base64);
        let bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return new File([bytes], fileName, { type: "application/epub+zip" });
    }

    static async readStorage() {
        let result = await chrome.storage.session.get("kindleUpload");
        return result.kindleUpload || null;
    }

    static clearStorage() {
        return chrome.storage.session.remove(["kindleUpload"]);
    }

    static findFileInput(timeoutMs = 15000) {
        let timeout = timeoutMs;
        return new Promise(function(resolve) {
            // Check if file input already exists
            let input = document.querySelector("input[type='file']");
            if (input) {
                resolve(input);
                return;
            }

            let observer = null;
            let timer = setTimeout(function() {
                if (observer) {
                    observer.disconnect();
                }
                resolve(null);
            }, timeout);

            observer = new MutationObserver(function() {
                let found = document.querySelector("input[type='file']");
                if (found) {
                    clearTimeout(timer);
                    observer.disconnect();
                    resolve(found);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        });
    }

    static attachFileToInput(input, file) {
        let dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input.files = dataTransfer.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.dispatchEvent(new Event("input", { bubbles: true }));
    }

    static async run() {
        try {
            let data = await SendToKindleContent.readStorage();
            if (!data) {
                return;
            }

            await SendToKindleContent.clearStorage();

            let file = SendToKindleContent.base64ToFile(data.base64, data.fileName);
            let input = await SendToKindleContent.findFileInput();

            if (!input) {
                alert("Could not auto-upload. Please upload manually.");
                return;
            }

            SendToKindleContent.attachFileToInput(input, file);
        } catch (err) {
            alert("Could not auto-upload. Please upload manually.");
            console.error("SendToKindleContent error:", err);
        }

        // Content scripts cannot call chrome.scripting.unregisterContentScripts.
        // The registration uses persistAcrossSessions: false, so it expires
        // automatically when the browser session ends.
    }
}

// Auto-run when loaded as a content script (not in test environment)
if (typeof QUnit === "undefined") {
    SendToKindleContent.run();
}
