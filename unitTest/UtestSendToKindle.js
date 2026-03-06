
"use strict";

module("SendToKindle");

QUnit.test("blobToBase64 converts blob to base64 string", function (assert) {
    let done = assert.async();
    let blob = new Blob(["hello world"], { type: "application/epub+zip" });
    SendToKindle.blobToBase64(blob).then(function (base64) {
        assert.ok(typeof base64 === "string");
        assert.ok(base64.length > 0);
        // "hello world" in base64 is "aGVsbG8gd29ybGQ="
        assert.equal(base64, "aGVsbG8gd29ybGQ=");
        done();
    });
});

QUnit.test("blobToBase64 handles empty blob", function (assert) {
    let done = assert.async();
    let blob = new Blob([], { type: "application/epub+zip" });
    SendToKindle.blobToBase64(blob).then(function (base64) {
        assert.equal(base64, "");
        done();
    });
});

QUnit.test("send stores data in chrome.storage.session", function (assert) {
    let done = assert.async();
    let storedData = null;
    let accessLevelSet = false;

    // Save originals
    let origStorage = chrome.storage;
    let origScripting = chrome.scripting;
    let origTabs = chrome.tabs;

    chrome.storage = {
        session: {
            setAccessLevel: function () {
                accessLevelSet = true;
                return Promise.resolve();
            },
            set: function (data) {
                storedData = data;
                return Promise.resolve();
            }
        }
    };
    chrome.scripting = {
        registerContentScripts: function () {
            return Promise.resolve();
        }
    };
    chrome.tabs = {
        create: function () {
            return Promise.resolve({ id: 1 });
        }
    };

    let blob = new Blob(["test"], { type: "application/epub+zip" });
    SendToKindle.send(blob, "test.epub").then(function () {
        assert.ok(storedData !== null, "data was stored");
        assert.ok(storedData.kindleUpload !== undefined, "kindleUpload key exists");
        assert.equal(storedData.kindleUpload.fileName, "test.epub");
        assert.ok(typeof storedData.kindleUpload.base64 === "string");
        assert.ok(accessLevelSet, "access level was set");
        // Restore
        chrome.storage = origStorage;
        chrome.scripting = origScripting;
        chrome.tabs = origTabs;
        done();
    }).catch(function (err) {
        chrome.storage = origStorage;
        chrome.scripting = origScripting;
        chrome.tabs = origTabs;
        assert.ok(false, "send() threw: " + err.message);
        done();
    });
});

QUnit.test("send registers content script", function (assert) {
    let done = assert.async();
    let registeredScripts = null;

    let origStorage = chrome.storage;
    let origScripting = chrome.scripting;
    let origTabs = chrome.tabs;

    chrome.storage = {
        session: {
            setAccessLevel: function () {
                return Promise.resolve();
            },
            set: function () {
                return Promise.resolve();
            }
        }
    };
    chrome.scripting = {
        registerContentScripts: function (scripts) {
            registeredScripts = scripts;
            return Promise.resolve();
        }
    };
    chrome.tabs = {
        create: function () {
            return Promise.resolve({ id: 1 });
        }
    };

    let blob = new Blob(["test"], { type: "application/epub+zip" });
    SendToKindle.send(blob, "test.epub").then(function () {
        assert.ok(registeredScripts !== null, "scripts were registered");
        assert.equal(registeredScripts.length, 1);
        assert.equal(registeredScripts[0].id, "sendToKindleContent");
        assert.ok(registeredScripts[0].matches.includes("https://www.amazon.com/sendtokindle*"));
        assert.deepEqual(registeredScripts[0].js, ["js/SendToKindleContent.js"]);
        assert.equal(registeredScripts[0].persistAcrossSessions, false, "should not persist across sessions");
        // Restore
        chrome.storage = origStorage;
        chrome.scripting = origScripting;
        chrome.tabs = origTabs;
        done();
    }).catch(function (err) {
        chrome.storage = origStorage;
        chrome.scripting = origScripting;
        chrome.tabs = origTabs;
        assert.ok(false, "send() threw: " + err.message);
        done();
    });
});

QUnit.test("send opens a new tab to Amazon Send to Kindle", function (assert) {
    let done = assert.async();
    let createdTabUrl = null;

    let origStorage = chrome.storage;
    let origScripting = chrome.scripting;
    let origTabs = chrome.tabs;

    chrome.storage = {
        session: {
            setAccessLevel: function () {
                return Promise.resolve();
            },
            set: function () {
                return Promise.resolve();
            }
        }
    };
    chrome.scripting = {
        registerContentScripts: function () {
            return Promise.resolve();
        }
    };
    chrome.tabs = {
        create: function (options) {
            createdTabUrl = options.url;
            return Promise.resolve({ id: 1 });
        }
    };

    let blob = new Blob(["test"], { type: "application/epub+zip" });
    SendToKindle.send(blob, "test.epub").then(function () {
        assert.equal(createdTabUrl, "https://www.amazon.com/sendtokindle");
        // Restore
        chrome.storage = origStorage;
        chrome.scripting = origScripting;
        chrome.tabs = origTabs;
        done();
    }).catch(function (err) {
        chrome.storage = origStorage;
        chrome.scripting = origScripting;
        chrome.tabs = origTabs;
        assert.ok(false, "send() threw: " + err.message);
        done();
    });
});

QUnit.test("send handles storage errors gracefully", function (assert) {
    let done = assert.async();
    let tabCreated = false;

    let origStorage = chrome.storage;
    let origScripting = chrome.scripting;
    let origTabs = chrome.tabs;

    chrome.storage = {
        session: {
            setAccessLevel: function () {
                return Promise.resolve();
            },
            set: function () {
                return Promise.reject(new Error("QUOTA_BYTES_PER_ITEM quota exceeded"));
            }
        }
    };
    chrome.scripting = {
        registerContentScripts: function () {
            return Promise.resolve();
        }
    };
    chrome.tabs = {
        create: function () {
            tabCreated = true;
            return Promise.resolve({ id: 1 });
        }
    };

    let blob = new Blob(["test"], { type: "application/epub+zip" });
    SendToKindle.send(blob, "test.epub").then(function () {
        assert.ok(!tabCreated, "tab should not be created when storage fails");
        // Restore
        chrome.storage = origStorage;
        chrome.scripting = origScripting;
        chrome.tabs = origTabs;
        done();
    }).catch(function (err) {
        chrome.storage = origStorage;
        chrome.scripting = origScripting;
        chrome.tabs = origTabs;
        assert.ok(false, "send() should not throw, but got: " + err.message);
        done();
    });
});
