
"use strict";

module("SendToKindlePrompt");

QUnit.test("shouldShow returns true when prompt never shown", function (assert) {
    window.localStorage.removeItem("sendToKindlePromptShown");
    assert.ok(SendToKindlePrompt.shouldShow(), "should show when flag not set");
});

QUnit.test("shouldShow returns false when prompt already shown", function (assert) {
    window.localStorage.setItem("sendToKindlePromptShown", "true");
    assert.notOk(SendToKindlePrompt.shouldShow(), "should not show when flag is set");
    window.localStorage.removeItem("sendToKindlePromptShown");
});

QUnit.test("markShown sets localStorage flag", function (assert) {
    window.localStorage.removeItem("sendToKindlePromptShown");
    SendToKindlePrompt.markShown();
    assert.equal(window.localStorage.getItem("sendToKindlePromptShown"), "true");
    window.localStorage.removeItem("sendToKindlePromptShown");
});

QUnit.test("show creates modal overlay in DOM", function (assert) {
    let done = assert.async();
    window.localStorage.removeItem("sendToKindlePromptShown");

    // Ensure no existing modal
    let existing = document.getElementById("sendToKindleModal");
    if (existing) existing.remove();

    SendToKindlePrompt.show(function () {});

    let modal = document.getElementById("sendToKindleModal");
    assert.ok(modal !== null, "modal should exist in DOM");
    assert.notOk(modal.hidden, "modal should be visible");

    // Clean up
    modal.remove();
    window.localStorage.removeItem("sendToKindlePromptShown");
    done();
});

QUnit.test("clicking Enable sets preference and marks shown", function (assert) {
    let done = assert.async();
    window.localStorage.removeItem("sendToKindlePromptShown");
    window.localStorage.removeItem("sendToKindle");

    let existing = document.getElementById("sendToKindleModal");
    if (existing) existing.remove();

    SendToKindlePrompt.show(function () {
        assert.equal(window.localStorage.getItem("sendToKindle"), "true", "preference should be enabled");
        assert.equal(window.localStorage.getItem("sendToKindlePromptShown"), "true", "prompt should be marked shown");
        assert.equal(document.getElementById("sendToKindleModal"), null, "modal should be removed");
        window.localStorage.removeItem("sendToKindlePromptShown");
        window.localStorage.removeItem("sendToKindle");
        done();
    });

    document.getElementById("sendToKindleEnableBtn").click();
});

QUnit.test("clicking No Thanks marks shown but does not enable", function (assert) {
    let done = assert.async();
    window.localStorage.removeItem("sendToKindlePromptShown");
    window.localStorage.removeItem("sendToKindle");

    let existing = document.getElementById("sendToKindleModal");
    if (existing) existing.remove();

    SendToKindlePrompt.show(function () {
        assert.notEqual(window.localStorage.getItem("sendToKindle"), "true", "preference should NOT be enabled");
        assert.equal(window.localStorage.getItem("sendToKindlePromptShown"), "true", "prompt should be marked shown");
        assert.equal(document.getElementById("sendToKindleModal"), null, "modal should be removed");
        window.localStorage.removeItem("sendToKindlePromptShown");
        done();
    });

    document.getElementById("sendToKindleDismissBtn").click();
});
