"use strict";

parserFactory.register("patreon.com", () => new PatreonParser());

class PatreonParser extends Parser {
    constructor() {
        super();
        this.strippedTitlePrefix = null;
    }

    async getChapterUrls(dom) {
        if (this.isCollectionList(dom)) {
            return this.getCollectionChapters(dom);
        }
        let cards = [...dom.querySelectorAll("div[data-tag='post-card']")];
        return cards
            .filter(c => this.hasAccessableContent(c))
            .map(s => this.cardToChapter(s)).reverse();
    }

    async getCollectionChapters(dom) {
        let collectionId = this.extractCollectionId(dom);
        if (collectionId) {
            try {
                let chapters = await this.fetchCollectionFromApi(collectionId);
                if (0 < chapters.length) {
                    return this.stripCommonTitlePrefix(chapters.reverse());
                }
            } catch (e) {
                console.log("Patreon API collection fetch failed, falling back to DOM parsing:", e);
            }
        }
        return this.stripCommonTitlePrefix(this.getCollectionLinks(dom).reverse());
    }

    extractCollectionId(dom) {
        let url = new URL(dom.baseURI);
        let match = url.pathname.match(/\/collection\/(\d+)/);
        return match ? match[1] : null;
    }

    async fetchCollectionFromApi(collectionId) {
        let chapters = [];
        let baseFields = "fields%5Bpost%5D=title%2Curl%2Cpublished_at%2Ccurrent_user_can_view";
        let url = `https://www.patreon.com/api/posts?filter%5Bcollection_id%5D=${collectionId}&sort=collection_order&${baseFields}&page%5Bcount%5D=50`;

        while (url) {
            let response = await HttpClient.fetchJson(url);
            let json = response.json;

            if (!json.data || !Array.isArray(json.data)) {
                break;
            }

            for (let post of json.data) {
                let attrs = post.attributes;
                // Skip posts the current user can't view (locked)
                if (attrs.current_user_can_view === false) {
                    continue;
                }
                let postUrl = attrs.url
                    ? new URL(attrs.url, "https://www.patreon.com").href
                    : `https://www.patreon.com/posts/${post.id}`;
                chapters.push({
                    sourceUrl: postUrl,
                    title: attrs.title || `Post ${post.id}`,
                });
            }

            // Handle pagination cursor
            url = json.links?.next || null;
        }

        return chapters;
    }

    getCollectionLinks(dom) {
        let getTitle = (e) => {
            // Try stable selectors first
            let titleEl = e.querySelector("[data-tag='post-title']");
            if (titleEl) {
                return titleEl.textContent.trim();
            }
            // Fallback: single-line-clamped text (title only, not body preview)
            titleEl = e.querySelector("span[class*='lineClamp1']");
            if (titleEl) {
                return titleEl.textContent.trim();
            }
            // Last resort: exact CSS module class
            titleEl = e.querySelector("span.LineClamp-module__N_eOMG__lineClamp1");
            return titleEl ? titleEl.textContent.trim() : "";
        };

        let isLocked = (e) => e.querySelector("svg[data-tag='IconLock']") != null;

        if (this.isCondensedView(dom))
        {
            let getLink = (e) => {
                return e.querySelector("a");
            };
            // Try stable attribute selector, then CSS module selector
            let linksContainer = [...dom.querySelectorAll("div[class*='listPost'], div[class*='ListPost']")]
                .filter(e => !isLocked(e));
            if (linksContainer.length === 0) {
                linksContainer = [...dom.querySelectorAll("div.ListPost-module__d2AM5a__listPost")]
                    .filter(e => !isLocked(e));
            }
            return linksContainer.map(linkContainer => {
                return {
                    sourceUrl: getLink(linkContainer).href,
                    title: getTitle(linkContainer),
                };
            });
        }

        // Grid/Expanded view: try flexible selectors
        let links = [...dom.querySelectorAll("a[class*='gridCard']")]
            .filter(e => !isLocked(e));
        if (links.length === 0) {
            // Fallback to exact CSS module class
            links = [...dom.querySelectorAll("a.CollectionPostList-module__IhO0fW__gridCard")]
                .filter(e => !isLocked(e));
        }
        return links.map(link => ({
            sourceUrl: link.href,
            title: getTitle(link),
        }));
    }

    cardToChapter(card) {
        let title = card.querySelector("span[data-tag='post-title']").textContent;
        let link = this.getUrlOfContent(card);
        return ({
            title: title.trim(),
            sourceUrl:  link.href
        });
    }

    hasAccessableContent(card) {
        let link = this.getUrlOfContent(card);
        return !util.isNullOrEmpty(link?.getAttribute("href"));
    }

    getUrlOfContent(card) {
        return card.querySelector("a[data-tag='post-published-at']");
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractPostId(url) {
        let match = url.match(/\/posts\/(?:.*-)?(\d+)/);
        return match ? match[1] : null;
    }

    async fetchChapter(url) {
        // Try API first
        let postId = this.extractPostId(url);
        if (postId) {
            try {
                let apiUrl = `https://www.patreon.com/api/posts/${postId}?fields%5Bpost%5D=title%2Ccontent%2Ccontent_json_string%2Cimage&json-api-version=1.0`;
                let response = await HttpClient.fetchJson(apiUrl);
                return this.jsonToHtml(response.json.data.attributes, url);
            } catch (e) {
                console.log("Patreon API fetch failed, trying __NEXT_DATA__:", e);
            }
        }

        // Fallback to __NEXT_DATA__
        console.log(`Patreon: falling back to __NEXT_DATA__ for ${url}`);
        let xhr = await HttpClient.wrapFetch(url);
        let script = xhr.responseXML.querySelector("script#__NEXT_DATA__").textContent;
        let json = JSON.parse(script);
        let envelope = json.props.pageProps.bootstrapEnvelope;
        let bootstrap = envelope.bootstrap || envelope.pageBootstrap;
        return this.jsonToHtml(bootstrap.post.data.attributes, url);
    }

    jsonToHtml(json, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        let header = newDoc.dom.createElement("h1");
        let title = json.title;
        if (this.strippedTitlePrefix && title.startsWith(this.strippedTitlePrefix)) {
            title = title.slice(this.strippedTitlePrefix.length);
        }
        header.textContent = title;
        newDoc.content.appendChild(header);
        if (json.image) {
            let img = new Image();
            img.src = json.image.url;
            newDoc.content.append(img);
        }
        let content;
        if (json.content)
        {
            content =  "<div>" + json.content + "</div>";
        }
        else if (json.content_json_string)
        {
            const tiptapToHtml = (node) => {
                if (!node) return null;

                // 1. Handle Text Nodes (Returns a Text Node or Span)
                if (node.type === "text") {
                    let root;
                    if (node.marks) {
                        // If there are marks, we build them nested
                        root = document.createElement("span");
                        let current = root;
                        node.marks.forEach(mark => {
                            let wrapper;
                            switch (mark.type) {
                                case "bold":
                                    wrapper = document.createElement("strong");
                                    break;
                                case "italic":
                                    wrapper = document.createElement("em");
                                    break;
                                case "underline":
                                    wrapper = document.createElement("u");
                                    break;
                                case "link":
                                    wrapper = document.createElement("a");
                                    wrapper.href = mark.attrs.href;
                                    wrapper.target = mark.attrs.target;
                                    break;
                                default:
                                    wrapper = document.createElement("span");
                                    console.error(`Unsupported mark type: "${mark.type}"`);
                            }
                            current.appendChild(wrapper);
                            current = wrapper;
                        });
                        current.textContent = node.text; // Safety here
                        return root;
                    } else {
                        // No marks? Just return a plain text node
                        return document.createTextNode(node.text);
                    }
                }

                // 2. Handle Block Types
                let element;
                switch (node.type) {
                    case "doc":
                        element = document.createElement("div");
                        element.className = "content-body";
                        break;

                    case "paragraph":
                        element = document.createElement("p");
                        if (node.attrs?.nodeTextAlignment) {
                            element.style.textAlign = node.attrs.nodeTextAlignment;
                        }
                        break;

                    case "heading":
                        element = document.createElement(`h${node.attrs.level || 3}`);
                        break;

                    case "bulletList":
                        element = document.createElement("ul");
                        break;

                    case "orderedList":
                        element = document.createElement("ol");
                        break;

                    case "listItem":
                        element = document.createElement("li");
                        break;

                    case "image":
                        element = document.createElement("img");
                        element.src = node.attrs.src;
                        element.alt = node.attrs.alt || "";
                        return element; // Images don't have children

                    case "blockquote":
                        element = document.createElement("blockquote");
                        break;

                    case "codeBlock": {
                        let pre = document.createElement("pre");
                        element = document.createElement("code");
                        pre.appendChild(element);

                        if (node.content) {
                            node.content.forEach(childNode => {
                                const child = tiptapToHtml(childNode);
                                if (child) element.appendChild(child);
                            });
                        }
                        return pre;
                    }
                    case "hardBreak":
                        return document.createElement("br");

                    default:
                        element = document.createElement("span");
                        break;
                }

                // 3. Recursive Step: Append children as actual DOM Nodes
                if (node.content) {
                    node.content.forEach(childNode => {
                        const childElement = tiptapToHtml(childNode);
                        if (childElement) {
                            element.appendChild(childElement);
                        }
                    });
                } else if (node.type !== "image" && node.type !== "hardBreak") {
                    // Handle empty blocks with a non-breaking space
                    element.textContent = "\u00A0";
                }

                return element;
            };
            content = tiptapToHtml(JSON.parse(json.content_json_string));
        }
        content = util.sanitize(content)
            .querySelector("div");
        newDoc.content.append(content);
        return newDoc.dom;
    }

    extractTitleImpl(dom) {
        if (this.strippedTitlePrefix) {
            let bookName = this.strippedTitlePrefix.replace(/ [-\u2013\u2014] $/, "");
            let h1 = dom.querySelector("h1");
            let collectionName = h1 ? h1.textContent.trim() : "";
            return bookName + (collectionName ? " - " + collectionName : "");
        }
        return dom.querySelector("h1").textContent + " Patreon";
    }

    extractAuthor(dom) {
        if (this.isCollectionList(dom)) {
            return this.extractCollectionAuthor(dom);
        }
        let authorLabel = dom.querySelector("h1");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    }

    extractCollectionAuthor(dom) {
        let title = dom.querySelector("h1");
        let parent = title.parentNode;
        while (parent.querySelector("a") == null) {
            parent = parent.parentNode;
        }
        return parent.querySelector("a")?.textContent ?? "Not Found";
    }

    findCoverImageUrl(dom) {
        if (this.isCollectionList(dom)) {
            return this.extractCollectionCover(dom);
        }
        return util.getFirstImgSrc(dom, "picture");
    }


    extractCollectionCover(dom) {
        let divsWithPicutres = dom.querySelectorAll("div[src]");
        if (divsWithPicutres.length == 0) {
            return null;
        }
        return divsWithPicutres[divsWithPicutres.length - 1].getAttribute("src");
    }

    stripCommonTitlePrefix(chapters) {
        if (chapters.length < 2) {
            return chapters;
        }
        let prefix = chapters[0].title;
        for (let i = 1; i < chapters.length; i++) {
            while (!chapters[i].title.startsWith(prefix)) {
                prefix = prefix.slice(0, -1);
                if (prefix.length === 0) {
                    return chapters;
                }
            }
        }
        let delimPattern = / [-\u2013\u2014] /g;
        let lastDelim = -1;
        let match;
        while ((match = delimPattern.exec(prefix)) !== null) {
            lastDelim = match.index;
        }
        if (lastDelim <= 0) {
            return chapters;
        }
        let stripLen = lastDelim + 3;
        if (chapters.some(ch => ch.title.length <= stripLen)) {
            return chapters;
        }
        this.strippedTitlePrefix = prefix.slice(0, stripLen);
        for (let ch of chapters) {
            ch.title = ch.title.slice(stripLen);
        }
        return chapters;
    }

    isCollectionList(dom) {
        return new URL(dom.baseURI).pathname.startsWith("/collection/");
    }

    isCondensedView(dom) {
        let url = new URL(dom.baseURI);
        return url.searchParams.get("view") === "condensed";
    }
}
