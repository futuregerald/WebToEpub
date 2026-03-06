
"use strict";

module("SendToKindleContent");

QUnit.test("base64ToFile converts base64 string to File object", function (assert) {
    // "hello world" in base64
    let base64 = "aGVsbG8gd29ybGQ=";
    let file = SendToKindleContent.base64ToFile(base64, "test.epub");
    assert.ok(file instanceof File);
    assert.equal(file.name, "test.epub");
    assert.equal(file.type, "application/epub+zip");
    assert.equal(file.size, 11); // "hello world" is 11 bytes
});

QUnit.test("base64ToFile handles empty string", function (assert) {
    let file = SendToKindleContent.base64ToFile("", "empty.epub");
    assert.ok(file instanceof File);
    assert.equal(file.name, "empty.epub");
    assert.equal(file.size, 0);
});

QUnit.test("readStorage reads from chrome.storage.session", function (assert) {
    let done = assert.async();

    let origStorage = chrome.storage;
    chrome.storage = {
        session: {
            get: function (key) {
                return Promise.resolve({
                    kindleUpload: {
                        base64: "aGVsbG8gd29ybGQ=",
                        fileName: "test.epub"
                    }
                });
            }
        }
    };

    SendToKindleContent.readStorage().then(function (data) {
        assert.ok(data !== null, "data was read");
        assert.equal(data.fileName, "test.epub");
        assert.equal(data.base64, "aGVsbG8gd29ybGQ=");
        chrome.storage = origStorage;
        done();
    }).catch(function (err) {
        chrome.storage = origStorage;
        assert.ok(false, "readStorage() threw: " + err.message);
        done();
    });
});

QUnit.test("readStorage returns null when no data", function (assert) {
    let done = assert.async();

    let origStorage = chrome.storage;
    chrome.storage = {
        session: {
            get: function () {
                return Promise.resolve({});
            }
        }
    };

    SendToKindleContent.readStorage().then(function (data) {
        assert.equal(data, null, "should return null when no kindleUpload key");
        chrome.storage = origStorage;
        done();
    }).catch(function (err) {
        chrome.storage = origStorage;
        assert.ok(false, "readStorage() threw: " + err.message);
        done();
    });
});

QUnit.test("clearStorage removes kindleUpload key", function (assert) {
    let done = assert.async();
    let removedKeys = null;

    let origStorage = chrome.storage;
    chrome.storage = {
        session: {
            remove: function (keys) {
                removedKeys = keys;
                return Promise.resolve();
            }
        }
    };

    SendToKindleContent.clearStorage().then(function () {
        assert.deepEqual(removedKeys, ["kindleUpload"]);
        chrome.storage = origStorage;
        done();
    }).catch(function (err) {
        chrome.storage = origStorage;
        assert.ok(false, "clearStorage() threw: " + err.message);
        done();
    });
});

QUnit.test("attachFileToInput sets files on input element", function (assert) {
    let input = document.createElement("input");
    input.type = "file";
    document.getElementById("qunit-fixture").appendChild(input);

    let base64 = "aGVsbG8gd29ybGQ=";
    let file = SendToKindleContent.base64ToFile(base64, "test.epub");

    let changeEventFired = false;
    let inputEventFired = false;
    input.addEventListener("change", function () { changeEventFired = true; });
    input.addEventListener("input", function () { inputEventFired = true; });

    SendToKindleContent.attachFileToInput(input, file);

    assert.equal(input.files.length, 1, "input should have 1 file");
    assert.equal(input.files[0].name, "test.epub");
    assert.ok(changeEventFired, "change event was dispatched");
    assert.ok(inputEventFired, "input event was dispatched");
});

QUnit.test("findFileInput finds existing file input", function (assert) {
    let done = assert.async();
    let input = document.createElement("input");
    input.type = "file";
    document.getElementById("qunit-fixture").appendChild(input);

    SendToKindleContent.findFileInput(100).then(function (foundInput) {
        assert.ok(foundInput !== null, "should find the input");
        assert.equal(foundInput.type, "file");
        done();
    }).catch(function (err) {
        assert.ok(false, "findFileInput() threw: " + err.message);
        done();
    });
});

QUnit.test("findFileInput times out when no input exists", function (assert) {
    let done = assert.async();
    // qunit-fixture is cleared between tests, so no file input present

    SendToKindleContent.findFileInput(100).then(function (foundInput) {
        assert.equal(foundInput, null, "should return null on timeout");
        done();
    }).catch(function (err) {
        assert.ok(false, "findFileInput() should not throw, got: " + err.message);
        done();
    });
});

QUnit.test("findFileInput finds dynamically added file input", function (assert) {
    let done = assert.async();

    // Add the input after a short delay to simulate dynamic page loading
    setTimeout(function () {
        let input = document.createElement("input");
        input.type = "file";
        document.getElementById("qunit-fixture").appendChild(input);
    }, 50);

    SendToKindleContent.findFileInput(500).then(function (foundInput) {
        assert.ok(foundInput !== null, "should find dynamically added input");
        assert.equal(foundInput.type, "file");
        done();
    }).catch(function (err) {
        assert.ok(false, "findFileInput() threw: " + err.message);
        done();
    });
});
