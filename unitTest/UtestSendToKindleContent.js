
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

QUnit.test("findDropZone finds element by ID", function (assert) {
    let done = assert.async();
    let div = document.createElement("div");
    div.id = "s2k-dnd-area";
    document.getElementById("qunit-fixture").appendChild(div);

    SendToKindleContent.findDropZone(100).then(function (zone) {
        assert.ok(zone !== null, "should find drop zone by ID");
        assert.equal(zone.id, "s2k-dnd-area");
        done();
    });
});

QUnit.test("findDropZone finds element by class fallback", function (assert) {
    let done = assert.async();
    let div = document.createElement("div");
    div.className = "s2k-dnd-section";
    document.getElementById("qunit-fixture").appendChild(div);

    SendToKindleContent.findDropZone(100).then(function (zone) {
        assert.ok(zone !== null, "should find drop zone by class");
        done();
    });
});

QUnit.test("findDropZone returns null on timeout", function (assert) {
    let done = assert.async();

    SendToKindleContent.findDropZone(100).then(function (zone) {
        assert.equal(zone, null, "should return null on timeout");
        done();
    });
});

QUnit.test("findDropZone finds dynamically added drop zone", function (assert) {
    let done = assert.async();

    setTimeout(function () {
        let div = document.createElement("div");
        div.id = "s2k-dnd-area";
        document.getElementById("qunit-fixture").appendChild(div);
    }, 50);

    SendToKindleContent.findDropZone(500).then(function (zone) {
        assert.ok(zone !== null, "should find dynamically added drop zone");
        done();
    });
});

QUnit.test("dropFileOnZone dispatches drag-drop events", function (assert) {
    let div = document.createElement("div");
    document.getElementById("qunit-fixture").appendChild(div);

    let events = [];
    div.addEventListener("dragenter", function () { events.push("dragenter"); });
    div.addEventListener("dragover", function () { events.push("dragover"); });
    div.addEventListener("drop", function (e) {
        events.push("drop");
        assert.equal(e.dataTransfer.files.length, 1, "drop event should have 1 file");
        assert.equal(e.dataTransfer.files[0].name, "test.epub");
    });

    let file = SendToKindleContent.base64ToFile("aGVsbG8gd29ybGQ=", "test.epub");
    SendToKindleContent.dropFileOnZone(div, file);

    assert.deepEqual(events, ["dragenter", "dragover", "drop"], "all three events fired in order");
});
