"use strict";

class VolumeMapper { // eslint-disable-line no-unused-vars

    // Extract a chapter number from a title string
    static extractChapterNumber(title) {
        let match = title.match(/(?:chapter|ch\.?|#)\s*(\d+)/i);
        if (match) return parseInt(match[1]);
        match = title.match(/^\s*(\d+)/);
        if (match) return parseInt(match[1]);
        return null;
    }

    // Normalize a webnovel.com URL to point to the catalog page
    static normalizeCatalogUrl(url) {
        let parsed = new URL(url);
        if (parsed.hostname !== "webnovel.com" && !parsed.hostname.endsWith(".webnovel.com")) {
            throw new Error("URL must be from webnovel.com");
        }
        // Extract book/comic path and append /catalog
        let bookMatch = parsed.pathname.match(/\/(book|comic)\/(?:.*?_)?\d+/);
        if (bookMatch) {
            return parsed.origin + bookMatch[0] + "/catalog";
        }
        // Already a catalog URL or similar
        if (parsed.pathname.endsWith("/catalog")) {
            return url;
        }
        return url + "/catalog";
    }

    // Fetch the webnovel.com catalog page and extract volume structure
    static async fetchVolumes(url) {
        let catalogUrl = VolumeMapper.normalizeCatalogUrl(url);
        let response = await HttpClient.wrapFetch(catalogUrl);
        let dom = response.responseXML;
        return VolumeMapper.parseVolumes(dom);
    }

    // Parse volume containers from the webnovel.com catalog DOM
    static parseVolumes(dom) {
        let volumes = [];

        // Try div.volume-item containers (newer webnovel.com layout)
        let volumeItems = [...dom.querySelectorAll("div.volume-item")];
        if (volumeItems.length > 0) {
            for (let volumeDiv of volumeItems) {
                let volume = VolumeMapper.parseVolumeItem(volumeDiv);
                if (volume) volumes.push(volume);
            }
            return volumes;
        }

        // Fallback: try ul.content-list (older layout, no volumes)
        // In this case there's only one implicit volume
        let links = [...dom.querySelectorAll("ul.content-list a")];
        if (links.length > 0) {
            let chapterNumbers = links
                .map(a => VolumeMapper.extractChapterNumber(a.textContent))
                .filter(n => n !== null);
            if (chapterNumbers.length > 0) {
                volumes.push({
                    title: "Volume 1",
                    startNum: Math.min(...chapterNumbers),
                    endNum: Math.max(...chapterNumbers)
                });
            }
        }

        return volumes;
    }

    // Parse a single div.volume-item container
    static parseVolumeItem(volumeDiv) {
        // Extract volume title - try various selectors
        let titleEl = volumeDiv.querySelector("p.g_title")
            || volumeDiv.querySelector(".volume-name")
            || volumeDiv.querySelector("h3")
            || volumeDiv.querySelector("h4")
            || volumeDiv.querySelector("p");

        let title = titleEl ? titleEl.textContent.trim() : "Unknown Volume";

        // Extract chapter links within this volume
        let links = [...volumeDiv.querySelectorAll("ol a, ul a, li a")];
        if (links.length === 0) return null;

        let chapterNumbers = links
            .map(a => VolumeMapper.extractChapterNumber(a.textContent))
            .filter(n => n !== null);

        if (chapterNumbers.length === 0) return null;

        return {
            title: title,
            startNum: Math.min(...chapterNumbers),
            endNum: Math.max(...chapterNumbers)
        };
    }

    // Map volumes to the local chapter list by chapter number
    // Returns { matchedCount, unmatchedCount, totalChapters, volumeCount }
    static mapVolumesToChapters(volumes, chapters) {
        let matchedCount = 0;
        let unmatchedCount = 0;
        let volumeFirstChapter = new Map(); // volume index -> first chapter index in local list

        for (let i = 0; i < chapters.length; i++) {
            let chapter = chapters[i];
            let chapterNum = VolumeMapper.extractChapterNumber(chapter.title);

            if (chapterNum === null) {
                unmatchedCount++;
                continue;
            }

            // Find which volume this chapter belongs to
            let volumeIndex = volumes.findIndex(v => chapterNum >= v.startNum && chapterNum <= v.endNum);
            if (volumeIndex === -1) {
                unmatchedCount++;
                continue;
            }

            matchedCount++;

            // Track the first chapter in each volume
            if (!volumeFirstChapter.has(volumeIndex)) {
                volumeFirstChapter.set(volumeIndex, i);
            }
        }

        // Set newArc on the first chapter of each volume
        for (let [volumeIndex, chapterIndex] of volumeFirstChapter) {
            chapters[chapterIndex].newArc = volumes[volumeIndex].title;
        }

        return {
            matchedCount: matchedCount,
            unmatchedCount: unmatchedCount,
            totalChapters: chapters.length,
            volumeCount: volumes.length
        };
    }
}
