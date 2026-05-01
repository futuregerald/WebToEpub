"use strict";

class VolumeMapper { // eslint-disable-line no-unused-vars

    // Extract a chapter number from a title string
    static extractChapterNumber(title) {
        let match = title.match(/(?:chapter|ch\.?|#)\s*(\d+)/i);
        if (match) return parseInt(match[1], 10);
        // Fallback: leading digits followed by a separator (., :, -, whitespace+word)
        // Avoids false matches on titles like "2023 New Year Special"
        match = title.match(/^\s*(\d+)\s*[.:)-]\s*/);
        if (match) return parseInt(match[1], 10);
        return null;
    }

    // Detect which site a URL belongs to
    static detectSite(url) {
        let parsed = new URL(url);
        let host = parsed.hostname.replace(/^www\./, "");
        if (host === "webnovel.com" || host.endsWith(".webnovel.com")) {
            return "webnovel";
        }
        if (host === "royalroad.com" || host === "royalroadl.com"
            || host.endsWith(".royalroad.com")) {
            return "royalroad";
        }
        return null;
    }

    // Fetch volume structure from a supported site
    static async fetchVolumes(url) {
        let site = VolumeMapper.detectSite(url);
        if (site === "webnovel") {
            return VolumeMapper.fetchWebnovelVolumes(url);
        }
        if (site === "royalroad") {
            return VolumeMapper.fetchRoyalRoadVolumes(url);
        }
        throw new Error("Unsupported site. Use webnovel.com or royalroad.com");
    }

    // Normalize a webnovel.com URL to point to the catalog page
    static normalizeWebnovelCatalogUrl(url) {
        let parsed = new URL(url);
        if (parsed.hostname !== "webnovel.com" && !parsed.hostname.endsWith(".webnovel.com")) {
            throw new Error("URL must be from webnovel.com");
        }
        let bookMatch = parsed.pathname.match(/\/(book|comic)\/(?:.*?_)?\d+/);
        if (bookMatch) {
            return parsed.origin + bookMatch[0] + "/catalog";
        }
        if (parsed.pathname.endsWith("/catalog")) {
            return url;
        }
        throw new Error("Could not find book/comic ID in URL");
    }

    // Fetch and parse webnovel.com catalog page
    static async fetchWebnovelVolumes(url) {
        let catalogUrl = VolumeMapper.normalizeWebnovelCatalogUrl(url);
        let response = await HttpClient.wrapFetch(catalogUrl);
        return VolumeMapper.parseWebnovelVolumes(response.responseXML);
    }

    // Parse volume structure from webnovel.com catalog DOM
    // Uses chapter counts per volume-item, not chapter number extraction
    static parseWebnovelVolumes(dom) {
        let volumes = [];

        let volumeItems = [...dom.querySelectorAll("div.volume-item")];
        if (volumeItems.length > 0) {
            for (let volumeDiv of volumeItems) {
                let titleEl = volumeDiv.querySelector("h4")
                    || volumeDiv.querySelector("p.g_title")
                    || volumeDiv.querySelector(".volume-name")
                    || volumeDiv.querySelector("h3")
                    || volumeDiv.querySelector("p");
                let title = titleEl ? titleEl.textContent.trim() : "Unknown Volume";

                let chapterCount = volumeDiv.querySelectorAll("ol li, ul li").length;
                if (chapterCount > 0) {
                    volumes.push({ title, chapterCount });
                }
            }
            return volumes;
        }

        // Fallback: older layout with a single flat list
        let links = [...dom.querySelectorAll("ul.content-list li")];
        if (links.length > 0) {
            volumes.push({ title: "Volume 1", chapterCount: links.length });
        }

        return volumes;
    }

    // Fetch and parse Royal Road fiction page
    static async fetchRoyalRoadVolumes(url) {
        let response = await HttpClient.wrapFetch(url);
        return VolumeMapper.parseRoyalRoadVolumes(response.responseXML);
    }

    // Parse volume structure from Royal Road page
    // Extracts window.volumes and window.chapters from embedded script tags
    static parseRoyalRoadVolumes(dom) {
        let scriptElement = [...dom.querySelectorAll("script")]
            .filter(s => s.textContent.includes("window.volumes ="))[0];

        if (!scriptElement) return [];

        let text = scriptElement.textContent;
        let volumesData = util.locateAndExtractJson(text, "window.volumes =");
        let chaptersData = util.locateAndExtractJson(text, "window.chapters =");

        if (!volumesData || !chaptersData) return [];

        // Sort volumes by order
        volumesData.sort((a, b) => a.order - b.order);

        // Count chapters per volume
        let chapterCounts = new Map();
        for (let vol of volumesData) {
            chapterCounts.set(vol.id, 0);
        }
        for (let ch of chaptersData) {
            if (chapterCounts.has(ch.volumeId)) {
                chapterCounts.set(ch.volumeId, chapterCounts.get(ch.volumeId) + 1);
            }
        }

        let volumes = [];
        for (let vol of volumesData) {
            let count = chapterCounts.get(vol.id) || 0;
            if (count > 0) {
                volumes.push({ title: vol.title, chapterCount: count });
            }
        }
        return volumes;
    }

    // Map volumes to the local chapter list using sequential chapter counts
    // Returns { volumeRanges, volumeCount, totalChapters, totalVolumeChapters, chapterCountDiff }
    static mapVolumesToChapters(volumes, chapters) {
        let volumeRanges = [];
        let offset = 0;

        // Clear any existing volume markers
        for (let ch of chapters) {
            ch.newArc = null;
        }

        let totalVolumeChapters = volumes.reduce((sum, v) => sum + v.chapterCount, 0);

        for (let volume of volumes) {
            let startIndex = offset;
            let endIndex = Math.min(offset + volume.chapterCount - 1, chapters.length - 1);

            if (startIndex < chapters.length) {
                chapters[startIndex].newArc = volume.title;
                volumeRanges.push({
                    title: volume.title,
                    startIndex: startIndex,
                    endIndex: endIndex
                });
            }
            offset += volume.chapterCount;
        }

        let diff = Math.abs(totalVolumeChapters - chapters.length);

        return {
            volumeRanges: volumeRanges,
            totalChapters: chapters.length,
            totalVolumeChapters: totalVolumeChapters,
            volumeCount: volumes.length,
            chapterCountDiff: diff
        };
    }
}
