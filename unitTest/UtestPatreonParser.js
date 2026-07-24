
"use strict";

module("UtestPatreonParser");

function makePatreonCollectionDom(baseUri) {
    let dom = TestUtils.makeDomWithBody("");
    util.setBaseTag(baseUri, dom);
    return dom;
}

QUnit.test("parserFactory", function (assert) {
    let parser = parserFactory.fetch("https://www.patreon.com/c/nrsearcy/posts");
    assert.ok(parser instanceof PatreonParser);
});

QUnit.test("isCollectionList_true", function (assert) {
    let parser = new PatreonParser();
    let dom = makePatreonCollectionDom("https://www.patreon.com/collection/1695716");
    assert.ok(parser.isCollectionList(dom));
});

QUnit.test("isCollectionList_false", function (assert) {
    let parser = new PatreonParser();
    let dom = makePatreonCollectionDom("https://www.patreon.com/c/nrsearcy/posts");
    assert.ok(!parser.isCollectionList(dom));
});

QUnit.test("isCondensedView_true", function (assert) {
    let parser = new PatreonParser();
    let dom = makePatreonCollectionDom("https://www.patreon.com/collection/1695716?view=condensed");
    assert.ok(parser.isCondensedView(dom));
});

QUnit.test("isCondensedView_false", function (assert) {
    let parser = new PatreonParser();
    let dom = makePatreonCollectionDom("https://www.patreon.com/collection/1695716?view=expanded");
    assert.ok(!parser.isCondensedView(dom));
});

QUnit.test("extractCollectionId", function (assert) {
    let parser = new PatreonParser();
    let dom = makePatreonCollectionDom("https://www.patreon.com/collection/1695716");
    assert.equal(parser.extractCollectionId(dom), "1695716");
});

QUnit.test("extractCollectionId_withQueryParams", function (assert) {
    let parser = new PatreonParser();
    let dom = makePatreonCollectionDom("https://www.patreon.com/collection/1695716?view=expanded");
    assert.equal(parser.extractCollectionId(dom), "1695716");
});

QUnit.test("extractCollectionId_nonCollection", function (assert) {
    let parser = new PatreonParser();
    let dom = makePatreonCollectionDom("https://www.patreon.com/c/nrsearcy/posts");
    assert.equal(parser.extractCollectionId(dom), null);
});

QUnit.test("extractPostId_standardUrl", function (assert) {
    let parser = new PatreonParser();
    assert.equal(parser.extractPostId("https://www.patreon.com/posts/chapter-1-12345678"), "12345678");
});

QUnit.test("extractPostId_numericOnly", function (assert) {
    let parser = new PatreonParser();
    assert.equal(parser.extractPostId("https://www.patreon.com/posts/12345678"), "12345678");
});

QUnit.test("extractPostId_noMatch", function (assert) {
    let parser = new PatreonParser();
    assert.equal(parser.extractPostId("https://www.patreon.com/c/nrsearcy/posts"), null);
});

QUnit.test("extractPostId_complexTitle", function (assert) {
    let parser = new PatreonParser();
    assert.equal(parser.extractPostId("https://www.patreon.com/posts/my-cool-post-title-99887766"), "99887766");
});

QUnit.test("getCollectionLinks_gridView", function (assert) {
    let html =
        "<a class='CollectionPostList-module__IhO0fW__gridCard' href='https://www.patreon.com/posts/chapter-1-111'>" +
            "<span data-tag='post-title'>Chapter 1</span>" +
        "</a>" +
        "<a class='CollectionPostList-module__IhO0fW__gridCard' href='https://www.patreon.com/posts/chapter-2-222'>" +
            "<span data-tag='post-title'>Chapter 2</span>" +
        "</a>";
    let dom = TestUtils.makeDomWithBody(html);
    util.setBaseTag("https://www.patreon.com/collection/123456", dom);
    let parser = new PatreonParser();
    let chapters = parser.getCollectionLinks(dom);
    assert.equal(chapters.length, 2);
    assert.equal(chapters[0].title, "Chapter 1");
    assert.equal(chapters[1].title, "Chapter 2");
});

QUnit.test("getCollectionLinks_lockedChaptersFiltered", function (assert) {
    let html =
        "<a class='CollectionPostList-module__IhO0fW__gridCard' href='https://www.patreon.com/posts/chapter-1-111'>" +
            "<span data-tag='post-title'>Chapter 1</span>" +
        "</a>" +
        "<a class='CollectionPostList-module__IhO0fW__gridCard' href='https://www.patreon.com/posts/chapter-2-222'>" +
            "<svg data-tag='IconLock'></svg>" +
            "<span data-tag='post-title'>Chapter 2 (Locked)</span>" +
        "</a>";
    let dom = TestUtils.makeDomWithBody(html);
    util.setBaseTag("https://www.patreon.com/collection/123456", dom);
    let parser = new PatreonParser();
    let chapters = parser.getCollectionLinks(dom);
    assert.equal(chapters.length, 1);
    assert.equal(chapters[0].title, "Chapter 1");
});

QUnit.test("getCollectionLinks_flexibleGridCardSelector", function (assert) {
    let html =
        "<a class='somePrefix__gridCard__someSuffix' href='https://www.patreon.com/posts/ch-1-111'>" +
            "<span data-tag='post-title'>Chapter 1</span>" +
        "</a>";
    let dom = TestUtils.makeDomWithBody(html);
    util.setBaseTag("https://www.patreon.com/collection/123456", dom);
    let parser = new PatreonParser();
    let chapters = parser.getCollectionLinks(dom);
    assert.equal(chapters.length, 1);
    assert.equal(chapters[0].title, "Chapter 1");
});

QUnit.test("getCollectionLinks_condensedView", function (assert) {
    let html =
        "<div class='ListPost-module__d2AM5a__listPost'>" +
            "<a href='https://www.patreon.com/posts/chapter-1-111'>Link</a>" +
            "<span data-tag='post-title'>Chapter 1</span>" +
        "</div>" +
        "<div class='ListPost-module__d2AM5a__listPost'>" +
            "<a href='https://www.patreon.com/posts/chapter-2-222'>Link</a>" +
            "<span data-tag='post-title'>Chapter 2</span>" +
        "</div>";
    let dom = TestUtils.makeDomWithBody(html);
    util.setBaseTag("https://www.patreon.com/collection/123456?view=condensed", dom);
    let parser = new PatreonParser();
    let chapters = parser.getCollectionLinks(dom);
    assert.equal(chapters.length, 2);
    assert.equal(chapters[0].title, "Chapter 1");
    assert.equal(chapters[1].title, "Chapter 2");
});

QUnit.test("getCollectionLinks_condensedView_lockedFiltered", function (assert) {
    let html =
        "<div class='ListPost-module__d2AM5a__listPost'>" +
            "<a href='https://www.patreon.com/posts/chapter-1-111'>Link</a>" +
            "<span data-tag='post-title'>Chapter 1</span>" +
        "</div>" +
        "<div class='ListPost-module__d2AM5a__listPost'>" +
            "<svg data-tag='IconLock'></svg>" +
            "<a href='https://www.patreon.com/posts/chapter-2-222'>Link</a>" +
            "<span data-tag='post-title'>Chapter 2 (Locked)</span>" +
        "</div>";
    let dom = TestUtils.makeDomWithBody(html);
    util.setBaseTag("https://www.patreon.com/collection/123456?view=condensed", dom);
    let parser = new PatreonParser();
    let chapters = parser.getCollectionLinks(dom);
    assert.equal(chapters.length, 1);
    assert.equal(chapters[0].title, "Chapter 1");
});

QUnit.test("getCollectionLinks_titleFallback_lineClamp", function (assert) {
    let html =
        "<a class='CollectionPostList-module__IhO0fW__gridCard' href='https://www.patreon.com/posts/ch-1-111'>" +
            "<span class='somePrefix__lineClamp1'>Chapter 1 Title</span>" +
        "</a>";
    let dom = TestUtils.makeDomWithBody(html);
    util.setBaseTag("https://www.patreon.com/collection/123456", dom);
    let parser = new PatreonParser();
    let chapters = parser.getCollectionLinks(dom);
    assert.equal(chapters.length, 1);
    assert.equal(chapters[0].title, "Chapter 1 Title");
});

QUnit.test("getCollectionLinks_titleIgnoresBodyPreview", function (assert) {
    let html =
        "<a class='somePrefix__gridCard__hash' href='https://www.patreon.com/posts/ch-1-111'>" +
            "<span class='LineClamp-module__hash__lineClamp1'>Chapter 1 Title</span>" +
            "<span class='LineClamp-module__hash__lineClamp2'>Body preview text that should not appear in title...</span>" +
        "</a>";
    let dom = TestUtils.makeDomWithBody(html);
    util.setBaseTag("https://www.patreon.com/collection/123456", dom);
    let parser = new PatreonParser();
    let chapters = parser.getCollectionLinks(dom);
    assert.equal(chapters.length, 1);
    assert.equal(chapters[0].title, "Chapter 1 Title");
});

QUnit.test("cardToChapter", function (assert) {
    let html =
        "<div data-tag='post-card'>" +
            "<span data-tag='post-title'>  My Post Title  </span>" +
            "<a data-tag='post-published-at' href='https://www.patreon.com/posts/my-post-123'>date</a>" +
        "</div>";
    let dom = TestUtils.makeDomWithBody(html);
    let parser = new PatreonParser();
    let card = dom.querySelector("div[data-tag='post-card']");
    let chapter = parser.cardToChapter(card);
    assert.equal(chapter.title, "My Post Title");
    assert.equal(chapter.sourceUrl, "https://www.patreon.com/posts/my-post-123");
});

QUnit.test("hasAccessableContent_true", function (assert) {
    let html =
        "<div data-tag='post-card'>" +
            "<a data-tag='post-published-at' href='https://www.patreon.com/posts/123'>date</a>" +
        "</div>";
    let dom = TestUtils.makeDomWithBody(html);
    let parser = new PatreonParser();
    let card = dom.querySelector("div[data-tag='post-card']");
    assert.ok(parser.hasAccessableContent(card));
});

QUnit.test("hasAccessableContent_false_noLink", function (assert) {
    let html =
        "<div data-tag='post-card'>" +
            "<span>No link here</span>" +
        "</div>";
    let dom = TestUtils.makeDomWithBody(html);
    let parser = new PatreonParser();
    let card = dom.querySelector("div[data-tag='post-card']");
    assert.ok(!parser.hasAccessableContent(card));
});

QUnit.test("hasAccessableContent_false_emptyHref", function (assert) {
    let html =
        "<div data-tag='post-card'>" +
            "<a data-tag='post-published-at' href=''>date</a>" +
        "</div>";
    let dom = TestUtils.makeDomWithBody(html);
    let parser = new PatreonParser();
    let card = dom.querySelector("div[data-tag='post-card']");
    assert.ok(!parser.hasAccessableContent(card));
});

QUnit.test("jsonToHtml_withContent", function (assert) {
    let parser = new PatreonParser();
    let json = {
        title: "Test Chapter",
        content: "<p>Hello world</p>",
        image: null
    };
    let dom = parser.jsonToHtml(json, "https://www.patreon.com/posts/test-123");
    let h1 = dom.querySelector("h1");
    assert.equal(h1.textContent, "Test Chapter");
    let p = dom.querySelector("p");
    assert.equal(p.textContent, "Hello world");
});

QUnit.test("jsonToHtml_withImage", function (assert) {
    let parser = new PatreonParser();
    let json = {
        title: "Image Chapter",
        content: "<p>Text</p>",
        image: { url: "https://example.com/image.jpg" }
    };
    let dom = parser.jsonToHtml(json, "https://www.patreon.com/posts/test-456");
    let img = dom.querySelector("img");
    assert.ok(img !== null);
    assert.equal(img.src, "https://example.com/image.jpg");
});

QUnit.test("extractTitleImpl", function (assert) {
    let dom = TestUtils.makeDomWithBody("<h1>My Creator</h1>");
    let parser = new PatreonParser();
    let title = parser.extractTitleImpl(dom);
    assert.equal(title, "My Creator Patreon");
});

QUnit.test("stripCommonTitlePrefix_removesBookName", function (assert) {
    let parser = new PatreonParser();
    let chapters = [
        { title: "Path of Dragons 15 - Chapter 91 - Reveal", sourceUrl: "a" },
        { title: "Path of Dragons 15 - Chapter 92 - Into the Wild", sourceUrl: "b" },
        { title: "Path of Dragons 15 - Chapter 93 - Peace", sourceUrl: "c" },
    ];
    parser.stripCommonTitlePrefix(chapters);
    assert.equal(chapters[0].title, "Chapter 91 - Reveal");
    assert.equal(chapters[1].title, "Chapter 92 - Into the Wild");
    assert.equal(chapters[2].title, "Chapter 93 - Peace");
    assert.equal(parser.strippedTitlePrefix, "Path of Dragons 15 - ");
});

QUnit.test("stripCommonTitlePrefix_storesNullWhenNoStrip", function (assert) {
    let parser = new PatreonParser();
    let chapters = [
        { title: "Chapter 1", sourceUrl: "a" },
        { title: "Chapter 2", sourceUrl: "b" },
    ];
    parser.stripCommonTitlePrefix(chapters);
    assert.equal(parser.strippedTitlePrefix, null);
});

QUnit.test("jsonToHtml_stripsStoredPrefix", function (assert) {
    let parser = new PatreonParser();
    parser.strippedTitlePrefix = "Path of Dragons 15 - ";
    let json = { title: "Path of Dragons 15 - Chapter 91 - Reveal", content: "<p>text</p>" };
    let dom = parser.jsonToHtml(json, "https://www.patreon.com/posts/test-123");
    assert.equal(dom.querySelector("h1").textContent, "Chapter 91 - Reveal");
});

QUnit.test("jsonToHtml_noStripWhenNullPrefix", function (assert) {
    let parser = new PatreonParser();
    let json = { title: "Full Title Here", content: "<p>text</p>" };
    let dom = parser.jsonToHtml(json, "https://www.patreon.com/posts/test-456");
    assert.equal(dom.querySelector("h1").textContent, "Full Title Here");
});

QUnit.test("extractTitleImpl_usesStrippedPrefix", function (assert) {
    let parser = new PatreonParser();
    parser.strippedTitlePrefix = "Path of Dragons 15 - ";
    let dom = TestUtils.makeDomWithBody("<h1>The Bound Sky (PoD 15)</h1>");
    let title = parser.extractTitleImpl(dom);
    assert.equal(title, "Path of Dragons 15 - The Bound Sky (PoD 15)");
});

QUnit.test("extractTitleImpl_fallbackWhenNoPrefix", function (assert) {
    let parser = new PatreonParser();
    let dom = TestUtils.makeDomWithBody("<h1>My Creator</h1>");
    let title = parser.extractTitleImpl(dom);
    assert.equal(title, "My Creator Patreon");
});

QUnit.test("stripCommonTitlePrefix_noDelimiter", function (assert) {
    let parser = new PatreonParser();
    let chapters = [
        { title: "Chapter 1", sourceUrl: "a" },
        { title: "Chapter 2", sourceUrl: "b" },
    ];
    parser.stripCommonTitlePrefix(chapters);
    assert.equal(chapters[0].title, "Chapter 1");
    assert.equal(chapters[1].title, "Chapter 2");
});

QUnit.test("stripCommonTitlePrefix_singleChapter", function (assert) {
    let parser = new PatreonParser();
    let chapters = [
        { title: "Book Name - Chapter 1", sourceUrl: "a" },
    ];
    parser.stripCommonTitlePrefix(chapters);
    assert.equal(chapters[0].title, "Book Name - Chapter 1");
});

QUnit.test("stripCommonTitlePrefix_noCommonPrefix", function (assert) {
    let parser = new PatreonParser();
    let chapters = [
        { title: "Prologue - The Beginning", sourceUrl: "a" },
        { title: "Chapter 1 - The Start", sourceUrl: "b" },
    ];
    parser.stripCommonTitlePrefix(chapters);
    assert.equal(chapters[0].title, "Prologue - The Beginning");
    assert.equal(chapters[1].title, "Chapter 1 - The Start");
});

QUnit.test("stripCommonTitlePrefix_enDash", function (assert) {
    let parser = new PatreonParser();
    let chapters = [
        { title: "Path of Dragons 15 \u2013 Chapter 91 \u2013 Reveal", sourceUrl: "a" },
        { title: "Path of Dragons 15 \u2013 Chapter 92 \u2013 Into the Wild", sourceUrl: "b" },
        { title: "Path of Dragons 15 \u2013 Chapter 100 \u2013 Peace", sourceUrl: "c" },
    ];
    parser.stripCommonTitlePrefix(chapters);
    assert.equal(chapters[0].title, "Chapter 91 \u2013 Reveal");
    assert.equal(chapters[1].title, "Chapter 92 \u2013 Into the Wild");
    assert.equal(chapters[2].title, "Chapter 100 \u2013 Peace");
});

QUnit.test("stripCommonTitlePrefix_emDash", function (assert) {
    let parser = new PatreonParser();
    let chapters = [
        { title: "Book Name \u2014 Chapter 1 \u2014 Start", sourceUrl: "a" },
        { title: "Book Name \u2014 Chapter 2 \u2014 Middle", sourceUrl: "b" },
    ];
    parser.stripCommonTitlePrefix(chapters);
    assert.equal(chapters[0].title, "Chapter 1 \u2014 Start");
    assert.equal(chapters[1].title, "Chapter 2 \u2014 Middle");
});

QUnit.test("extractAuthor_nonCollection", function (assert) {
    let dom = TestUtils.makeDomWithBody("<h1>Author Name</h1>");
    util.setBaseTag("https://www.patreon.com/c/nrsearcy/posts", dom);
    let parser = new PatreonParser();
    let author = parser.extractAuthor(dom);
    assert.equal(author, "Author Name");
});

const PATREON_MEDIA_URL =
    "https://c10.patreonusercontent.com/4/patreon-media/p/campaign/7835674/abc/image.jpg";

QUnit.test("extractCampaignId_fromImgSrc", function (assert) {
    let dom = TestUtils.makeDomWithBody(`<img src='${PATREON_MEDIA_URL}'>`);
    let parser = new PatreonParser();
    assert.equal(parser.extractCampaignId(dom), "7835674");
});

QUnit.test("extractCampaignId_fromSourceSrcset", function (assert) {
    let dom = TestUtils.makeDomWithBody(`<picture><source srcset='${PATREON_MEDIA_URL} 1x'></picture>`);
    let parser = new PatreonParser();
    assert.equal(parser.extractCampaignId(dom), "7835674");
});

QUnit.test("extractCampaignId_fromPreloadLink", function (assert) {
    let dom = TestUtils.makeDomWithBody(`<link rel='preload' as='image' href='${PATREON_MEDIA_URL}'>`);
    let parser = new PatreonParser();
    assert.equal(parser.extractCampaignId(dom), "7835674");
});

QUnit.test("extractCampaignId_fromDivSrc", function (assert) {
    let dom = TestUtils.makeDomWithBody(`<div src='${PATREON_MEDIA_URL}'></div>`);
    let parser = new PatreonParser();
    assert.equal(parser.extractCampaignId(dom), "7835674");
});

QUnit.test("extractCampaignId_returnsNull", function (assert) {
    let dom = TestUtils.makeDomWithBody("<img src='https://example.com/other.jpg'>");
    let parser = new PatreonParser();
    assert.equal(parser.extractCampaignId(dom), null);
});

QUnit.test("extractCampaignId_prefersMostFrequent", function (assert) {
    // A foreign campaign id appears first, but the collection's own dominates.
    let foreign = "https://c10.patreonusercontent.com/4/patreon-media/p/campaign/9999999/x/foreign.jpg";
    let html =
        `<img src='${foreign}'>` +
        `<img src='${PATREON_MEDIA_URL}'>` +
        `<img src='${PATREON_MEDIA_URL}'>`;
    let dom = TestUtils.makeDomWithBody(html);
    let parser = new PatreonParser();
    assert.equal(parser.extractCampaignId(dom), "7835674");
});

QUnit.test("getCollectionLinks_titleFromH3_multipleChildren", function (assert) {
    let html =
        "<a class='CollectionPostList-module__IhO0fW__gridCard' href='https://www.patreon.com/posts/ch-1-111'>" +
            "<h3 class='HeadingText-module__djfC6W__root'>\n    <div>Chapter 4 - The Reveal</div>\n</h3>" +
        "</a>";
    let dom = TestUtils.makeDomWithBody(html);
    util.setBaseTag("https://www.patreon.com/collection/123456", dom);
    let parser = new PatreonParser();
    let chapters = parser.getCollectionLinks(dom);
    assert.equal(chapters[0].title, "Chapter 4 - The Reveal");
});

QUnit.test("fetchCollectionFromApi_includesCampaignId", async function (assert) {
    let capturedUrl = null;
    let realFetchJson = HttpClient.fetchJson;
    HttpClient.fetchJson = (url) => {
        capturedUrl = url;
        return Promise.resolve({ json: { data: [
            { id: "1", attributes: { title: "Ch 1", url: "/posts/ch-1-1", current_user_can_view: true } }
        ], links: {} } });
    };
    try {
        let parser = new PatreonParser();
        let chapters = await parser.fetchCollectionFromApi("1489199", "7835674");
        assert.ok(capturedUrl.includes("filter%5Bcollection_id%5D=1489199"), "has collection_id");
        assert.ok(capturedUrl.includes("filter%5Bcampaign_id%5D=7835674"), "has campaign_id");
        assert.ok(capturedUrl.includes("sort=collection_order"), "has sort");
        assert.equal(chapters.length, 1);
        assert.equal(chapters[0].title, "Ch 1");
    } finally {
        HttpClient.fetchJson = realFetchJson;
    }
});

QUnit.test("fetchCollectionFromApi_omitsCampaignIdWhenNull", async function (assert) {
    let capturedUrl = null;
    let realFetchJson = HttpClient.fetchJson;
    HttpClient.fetchJson = (url) => {
        capturedUrl = url;
        return Promise.resolve({ json: { data: [], links: {} } });
    };
    try {
        let parser = new PatreonParser();
        await parser.fetchCollectionFromApi("1489199", null);
        assert.notOk(capturedUrl.includes("campaign_id"), "omits campaign_id when null");
    } finally {
        HttpClient.fetchJson = realFetchJson;
    }
});

QUnit.test("getCollectionLinks_titleFromH3", function (assert) {
    let html =
        "<a class='CollectionPostList-module__IhO0fW__gridCard' href='https://www.patreon.com/posts/ch-1-111'>" +
            "<h3 class='HeadingText-module__djfC6W__root'><div>Chapter 1</div></h3>" +
        "</a>";
    let dom = TestUtils.makeDomWithBody(html);
    util.setBaseTag("https://www.patreon.com/collection/123456", dom);
    let parser = new PatreonParser();
    let chapters = parser.getCollectionLinks(dom);
    assert.equal(chapters.length, 1);
    assert.equal(chapters[0].title, "Chapter 1");
});

QUnit.test("getCollectionLinks_titleFromH3_trimsWhitespace", function (assert) {
    let html =
        "<a class='CollectionPostList-module__IhO0fW__gridCard' href='https://www.patreon.com/posts/ch-1-111'>" +
            "<h3 class='HeadingText-module__djfC6W__root'><div>  Chapter 2  </div></h3>" +
        "</a>";
    let dom = TestUtils.makeDomWithBody(html);
    util.setBaseTag("https://www.patreon.com/collection/123456", dom);
    let parser = new PatreonParser();
    let chapters = parser.getCollectionLinks(dom);
    assert.equal(chapters[0].title, "Chapter 2");
});

QUnit.test("getCollectionLinks_h3IgnoresBodyPreview", function (assert) {
    let html =
        "<a class='CollectionPostList-module__IhO0fW__gridCard' href='https://www.patreon.com/posts/ch-1-111'>" +
            "<h3 class='HeadingText-module__djfC6W__root'><div>Chapter 3</div></h3>" +
            "<p>Body preview text that should not appear in the title...</p>" +
        "</a>";
    let dom = TestUtils.makeDomWithBody(html);
    util.setBaseTag("https://www.patreon.com/collection/123456", dom);
    let parser = new PatreonParser();
    let chapters = parser.getCollectionLinks(dom);
    assert.equal(chapters[0].title, "Chapter 3");
});

QUnit.test("getCollectionLinks_dataTagWinsOverH3", function (assert) {
    let html =
        "<a class='CollectionPostList-module__IhO0fW__gridCard' href='https://www.patreon.com/posts/ch-1-111'>" +
            "<span data-tag='post-title'>Real Title</span>" +
            "<h3><div>Other</div></h3>" +
        "</a>";
    let dom = TestUtils.makeDomWithBody(html);
    util.setBaseTag("https://www.patreon.com/collection/123456", dom);
    let parser = new PatreonParser();
    let chapters = parser.getCollectionLinks(dom);
    assert.equal(chapters[0].title, "Real Title");
});

QUnit.test("getCollectionLinks_teaserContentFiltered", function (assert) {
    let html =
        "<a class='CollectionPostList-module__IhO0fW__gridCard' href='https://www.patreon.com/posts/ch-1-111'>" +
            "<h3><div>Visible</div></h3>" +
        "</a>" +
        "<a class='CollectionPostList-module__IhO0fW__gridCard' href='https://www.patreon.com/posts/ch-2-222'>" +
            "<h3><div>Locked</div></h3>" +
            "<div data-tag='teaser-post-content'>preview text</div>" +
        "</a>";
    let dom = TestUtils.makeDomWithBody(html);
    util.setBaseTag("https://www.patreon.com/collection/123456", dom);
    let parser = new PatreonParser();
    let chapters = parser.getCollectionLinks(dom);
    assert.equal(chapters.length, 1);
    assert.equal(chapters[0].title, "Visible");
});

QUnit.test("getCollectionLinks_condensedView_teaserContentFiltered", function (assert) {
    let html =
        "<div class='ListPost-module__d2AM5a__listPost'>" +
            "<a href='https://www.patreon.com/posts/chapter-1-111'>Link</a>" +
            "<h3><div>Chapter 1</div></h3>" +
        "</div>" +
        "<div class='ListPost-module__d2AM5a__listPost'>" +
            "<a href='https://www.patreon.com/posts/chapter-2-222'>Link</a>" +
            "<h3><div>Chapter 2</div></h3>" +
            "<div data-tag='teaser-post-content'>preview text</div>" +
        "</div>";
    let dom = TestUtils.makeDomWithBody(html);
    util.setBaseTag("https://www.patreon.com/collection/123456?view=condensed", dom);
    let parser = new PatreonParser();
    let chapters = parser.getCollectionLinks(dom);
    assert.equal(chapters.length, 1);
    assert.equal(chapters[0].title, "Chapter 1");
});
