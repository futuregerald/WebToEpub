"use strict";

module("VolumeMapper");

test("extractChapterNumber_chapterPrefix", function (assert) {
    assert.equal(VolumeMapper.extractChapterNumber("Chapter 5: The Beginning"), 5);
    assert.equal(VolumeMapper.extractChapterNumber("Ch. 12 - Aftermath"), 12);
    assert.equal(VolumeMapper.extractChapterNumber("ch 99"), 99);
    assert.equal(VolumeMapper.extractChapterNumber("#3 Magic"), 3);
});

test("extractChapterNumber_leadingDigits", function (assert) {
    assert.equal(VolumeMapper.extractChapterNumber("5. The Beginning"), 5);
    assert.equal(VolumeMapper.extractChapterNumber("12: Aftermath"), 12);
    assert.equal(VolumeMapper.extractChapterNumber("99) Magic"), 99);
});

test("extractChapterNumber_noMatch", function (assert) {
    assert.equal(VolumeMapper.extractChapterNumber("The Beginning"), null);
    assert.equal(VolumeMapper.extractChapterNumber("2023 New Year Special"), null);
    assert.equal(VolumeMapper.extractChapterNumber("Just a title"), null);
});

test("detectSite_webnovel", function (assert) {
    assert.equal(VolumeMapper.detectSite("https://www.webnovel.com/book/shadow-slave_123"), "webnovel");
    assert.equal(VolumeMapper.detectSite("https://m.webnovel.com/book/123"), "webnovel");
    assert.equal(VolumeMapper.detectSite("https://webnovel.com/book/123/catalog"), "webnovel");
});

test("detectSite_royalroad", function (assert) {
    assert.equal(VolumeMapper.detectSite("https://www.royalroad.com/fiction/12345/title"), "royalroad");
    assert.equal(VolumeMapper.detectSite("https://royalroad.com/fiction/12345"), "royalroad");
    assert.equal(VolumeMapper.detectSite("https://www.royalroadl.com/fiction/12345"), "royalroad");
});

test("detectSite_unsupported", function (assert) {
    assert.equal(VolumeMapper.detectSite("https://novelfull.com/novel/123"), null);
    assert.equal(VolumeMapper.detectSite("https://example.com"), null);
});

test("normalizeWebnovelCatalogUrl_bookUrl", function (assert) {
    let url = "https://www.webnovel.com/book/shadow-slave_22196546206090805";
    let result = VolumeMapper.normalizeWebnovelCatalogUrl(url);
    assert.equal(result, "https://www.webnovel.com/book/shadow-slave_22196546206090805/catalog");
});

test("normalizeWebnovelCatalogUrl_alreadyCatalog", function (assert) {
    let url = "https://www.webnovel.com/book/shadow-slave_22196546206090805/catalog";
    let result = VolumeMapper.normalizeWebnovelCatalogUrl(url);
    assert.equal(result, url);
});

test("normalizeWebnovelCatalogUrl_nonWebnovelThrows", function (assert) {
    assert.throws(
        () => VolumeMapper.normalizeWebnovelCatalogUrl("https://novelfull.com/book/123"),
        /URL must be from webnovel.com/
    );
});

test("normalizeWebnovelCatalogUrl_invalidPathThrows", function (assert) {
    assert.throws(
        () => VolumeMapper.normalizeWebnovelCatalogUrl("https://www.webnovel.com/ranking"),
        /Could not find book\/comic ID/
    );
});

test("fetchVolumes_unsupportedSiteThrows", async function (assert) {
    try {
        await VolumeMapper.fetchVolumes("https://example.com/book/123");
        assert.ok(false, "Should have thrown");
    } catch (err) {
        assert.ok(err.message.includes("Unsupported site"));
    }
});

test("parseWebnovelVolumes_multipleVolumes", function (assert) {
    let html =
        "<div class='volume-item'>" +
            "<h4>Volume 1: First Arc</h4>" +
            "<ol><li>Ch1</li><li>Ch2</li><li>Ch3</li></ol>" +
        "</div>" +
        "<div class='volume-item'>" +
            "<h4>Volume 2: Second Arc</h4>" +
            "<ol><li>Ch4</li><li>Ch5</li></ol>" +
        "</div>";
    let dom = TestUtils.makeDomWithBody(html);
    let volumes = VolumeMapper.parseWebnovelVolumes(dom);

    assert.equal(volumes.length, 2);
    assert.equal(volumes[0].title, "Volume 1: First Arc");
    assert.equal(volumes[0].chapterCount, 3);
    assert.equal(volumes[1].title, "Volume 2: Second Arc");
    assert.equal(volumes[1].chapterCount, 2);
});

test("parseWebnovelVolumes_emptyVolumeSkipped", function (assert) {
    let html =
        "<div class='volume-item'>" +
            "<h4>Volume 1</h4>" +
            "<ol><li>Ch1</li></ol>" +
        "</div>" +
        "<div class='volume-item'>" +
            "<h4>Empty Volume</h4>" +
            "<ol></ol>" +
        "</div>";
    let dom = TestUtils.makeDomWithBody(html);
    let volumes = VolumeMapper.parseWebnovelVolumes(dom);

    assert.equal(volumes.length, 1);
    assert.equal(volumes[0].title, "Volume 1");
});

test("parseWebnovelVolumes_fallbackContentList", function (assert) {
    let html =
        "<ul class='content-list'>" +
            "<li>Ch1</li><li>Ch2</li><li>Ch3</li><li>Ch4</li>" +
        "</ul>";
    let dom = TestUtils.makeDomWithBody(html);
    let volumes = VolumeMapper.parseWebnovelVolumes(dom);

    assert.equal(volumes.length, 1);
    assert.equal(volumes[0].title, "Volume 1");
    assert.equal(volumes[0].chapterCount, 4);
});

test("parseWebnovelVolumes_noVolumes", function (assert) {
    let dom = TestUtils.makeDomWithBody("<div>No volumes here</div>");
    let volumes = VolumeMapper.parseWebnovelVolumes(dom);
    assert.equal(volumes.length, 0);
});

test("parseRoyalRoadVolumes_extractsFromScript", function (assert) {
    let scriptContent =
        "window.volumes = " + JSON.stringify([
            { id: 1, title: "Book 1: Awakening", order: 0, cover: "" },
            { id: 2, title: "Book 2: Evolution", order: 1, cover: "" }
        ]) + ";\n" +
        "window.chapters = " + JSON.stringify([
            { id: 101, title: "Ch 1", order: 0, url: "/ch/1", volumeId: 1 },
            { id: 102, title: "Ch 2", order: 1, url: "/ch/2", volumeId: 1 },
            { id: 103, title: "Ch 3", order: 2, url: "/ch/3", volumeId: 1 },
            { id: 104, title: "Ch 4", order: 3, url: "/ch/4", volumeId: 2 },
            { id: 105, title: "Ch 5", order: 4, url: "/ch/5", volumeId: 2 }
        ]) + ";";

    let html = "<script>" + scriptContent + "</script>";
    let dom = TestUtils.makeDomWithBody(html);
    let volumes = VolumeMapper.parseRoyalRoadVolumes(dom);

    assert.equal(volumes.length, 2);
    assert.equal(volumes[0].title, "Book 1: Awakening");
    assert.equal(volumes[0].chapterCount, 3);
    assert.equal(volumes[1].title, "Book 2: Evolution");
    assert.equal(volumes[1].chapterCount, 2);
});

test("parseRoyalRoadVolumes_sortsVolumesByOrder", function (assert) {
    let scriptContent =
        "window.volumes = " + JSON.stringify([
            { id: 2, title: "Book 2", order: 1, cover: "" },
            { id: 1, title: "Book 1", order: 0, cover: "" }
        ]) + ";\n" +
        "window.chapters = " + JSON.stringify([
            { id: 101, title: "Ch 1", order: 0, url: "/ch/1", volumeId: 1 },
            { id: 102, title: "Ch 2", order: 1, url: "/ch/2", volumeId: 2 }
        ]) + ";";

    let html = "<script>" + scriptContent + "</script>";
    let dom = TestUtils.makeDomWithBody(html);
    let volumes = VolumeMapper.parseRoyalRoadVolumes(dom);

    assert.equal(volumes[0].title, "Book 1");
    assert.equal(volumes[1].title, "Book 2");
});

test("parseRoyalRoadVolumes_noScript", function (assert) {
    let dom = TestUtils.makeDomWithBody("<div>No script</div>");
    let volumes = VolumeMapper.parseRoyalRoadVolumes(dom);
    assert.equal(volumes.length, 0);
});

test("parseRoyalRoadVolumes_emptyVolumeSkipped", function (assert) {
    let scriptContent =
        "window.volumes = " + JSON.stringify([
            { id: 1, title: "Book 1", order: 0, cover: "" },
            { id: 2, title: "Empty Book", order: 1, cover: "" }
        ]) + ";\n" +
        "window.chapters = " + JSON.stringify([
            { id: 101, title: "Ch 1", order: 0, url: "/ch/1", volumeId: 1 }
        ]) + ";";

    let html = "<script>" + scriptContent + "</script>";
    let dom = TestUtils.makeDomWithBody(html);
    let volumes = VolumeMapper.parseRoyalRoadVolumes(dom);

    assert.equal(volumes.length, 1);
    assert.equal(volumes[0].title, "Book 1");
});

test("mapVolumesToChapters_exactMatch", function (assert) {
    let volumes = [
        { title: "Vol 1", chapterCount: 3 },
        { title: "Vol 2", chapterCount: 2 }
    ];
    let chapters = [
        { title: "Ch 1" }, { title: "Ch 2" }, { title: "Ch 3" },
        { title: "Ch 4" }, { title: "Ch 5" }
    ];

    let result = VolumeMapper.mapVolumesToChapters(volumes, chapters);

    assert.equal(result.volumeCount, 2);
    assert.equal(result.totalChapters, 5);
    assert.equal(result.totalVolumeChapters, 5);
    assert.equal(result.chapterCountDiff, 0);
    assert.equal(result.volumeRanges.length, 2);

    assert.equal(chapters[0].newArc, "Vol 1");
    assert.equal(chapters[1].newArc, null);
    assert.equal(chapters[2].newArc, null);
    assert.equal(chapters[3].newArc, "Vol 2");
    assert.equal(chapters[4].newArc, null);

    assert.equal(result.volumeRanges[0].startIndex, 0);
    assert.equal(result.volumeRanges[0].endIndex, 2);
    assert.equal(result.volumeRanges[1].startIndex, 3);
    assert.equal(result.volumeRanges[1].endIndex, 4);
});

test("mapVolumesToChapters_moreLocalChapters", function (assert) {
    let volumes = [
        { title: "Vol 1", chapterCount: 2 },
        { title: "Vol 2", chapterCount: 2 }
    ];
    let chapters = [
        { title: "Ch 1" }, { title: "Ch 2" },
        { title: "Ch 3" }, { title: "Ch 4" },
        { title: "Ch 5" }
    ];

    let result = VolumeMapper.mapVolumesToChapters(volumes, chapters);

    assert.equal(result.chapterCountDiff, 1);
    assert.equal(result.totalVolumeChapters, 4);
    assert.equal(result.totalChapters, 5);
    assert.equal(chapters[0].newArc, "Vol 1");
    assert.equal(chapters[2].newArc, "Vol 2");
});

test("mapVolumesToChapters_fewerLocalChapters", function (assert) {
    let volumes = [
        { title: "Vol 1", chapterCount: 3 },
        { title: "Vol 2", chapterCount: 5 }
    ];
    let chapters = [
        { title: "Ch 1" }, { title: "Ch 2" }, { title: "Ch 3" },
        { title: "Ch 4" }
    ];

    let result = VolumeMapper.mapVolumesToChapters(volumes, chapters);

    assert.equal(result.chapterCountDiff, 4);
    assert.equal(chapters[0].newArc, "Vol 1");
    assert.equal(chapters[3].newArc, "Vol 2");
    // Vol 2 endIndex clamped to last chapter
    assert.equal(result.volumeRanges[1].endIndex, 3);
});

test("mapVolumesToChapters_emptyVolumes", function (assert) {
    let chapters = [{ title: "Ch 1" }, { title: "Ch 2" }];
    let result = VolumeMapper.mapVolumesToChapters([], chapters);

    assert.equal(result.volumeCount, 0);
    assert.equal(result.volumeRanges.length, 0);
    assert.equal(chapters[0].newArc, null);
});

test("mapVolumesToChapters_clearsPreviousNewArc", function (assert) {
    let chapters = [
        { title: "Ch 1", newArc: "Old Volume 1" },
        { title: "Ch 2" },
        { title: "Ch 3", newArc: "Old Volume 2" }
    ];
    let volumes = [{ title: "New Vol 1", chapterCount: 3 }];

    VolumeMapper.mapVolumesToChapters(volumes, chapters);

    assert.equal(chapters[0].newArc, "New Vol 1");
    assert.equal(chapters[1].newArc, null);
    assert.equal(chapters[2].newArc, null);
});
