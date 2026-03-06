
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

QUnit.test("extractAuthor_nonCollection", function (assert) {
    let dom = TestUtils.makeDomWithBody("<h1>Author Name</h1>");
    util.setBaseTag("https://www.patreon.com/c/nrsearcy/posts", dom);
    let parser = new PatreonParser();
    let author = parser.extractAuthor(dom);
    assert.equal(author, "Author Name");
});
