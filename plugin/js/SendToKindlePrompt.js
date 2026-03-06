"use strict";

class SendToKindlePrompt { // eslint-disable-line no-unused-vars
    static shouldShow() {
        return window.localStorage.getItem("sendToKindlePromptShown") !== "true";
    }

    static markShown() {
        window.localStorage.setItem("sendToKindlePromptShown", "true");
    }

    static show(onComplete) {
        let overlay = document.createElement("div");
        overlay.id = "sendToKindleModal";
        overlay.className = "stk-modal-overlay";

        overlay.innerHTML =
            "<div class=\"stk-modal\">" +
                "<div class=\"stk-modal-title\">Send to Kindle</div>" +
                "<p>Would you like to enable Send to Kindle? After downloading an EPUB, " +
                "a new tab will open to Amazon's Send to Kindle page to upload your file automatically.</p>" +
                "<p class=\"stk-modal-note\">Requires an Amazon account. " +
                "You can change this setting later in Advanced Options.</p>" +
                "<div class=\"stk-modal-buttons\">" +
                    "<button id=\"sendToKindleEnableBtn\" class=\"stk-modal-btn stk-modal-btn-primary\">Enable</button>" +
                    "<button id=\"sendToKindleDismissBtn\" class=\"stk-modal-btn\">No thanks</button>" +
                "</div>" +
            "</div>";

        document.body.appendChild(overlay);

        document.getElementById("sendToKindleEnableBtn").onclick = function() {
            window.localStorage.setItem("sendToKindle", "true");
            SendToKindlePrompt.markShown();
            overlay.remove();
            if (onComplete) onComplete();
        };

        document.getElementById("sendToKindleDismissBtn").onclick = function() {
            SendToKindlePrompt.markShown();
            overlay.remove();
            if (onComplete) onComplete();
        };
    }
}
