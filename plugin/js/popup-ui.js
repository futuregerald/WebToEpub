"use strict";

/**
 * UI interaction handler for the redesigned popup.
 * Manages: collapsible panels, settings tabs, cover preview, parser chip,
 *          chapter subtitle, colophon version.
 *
 * Runs BEFORE main.js — sets up observers and listeners so that when
 * main.js (and other scripts) modify DOM elements, the new visual
 * patterns update automatically without modifying existing code.
 */
var PopupUI = (function() {  // eslint-disable-line no-unused-vars
    "use strict";

    // ── Helpers ─────────────────────────────────────────────────────

    /** Safely query a single element; returns null when missing. */
    function $(selector) {
        return document.querySelector(selector);
    }

    /** Safely query all matching elements; returns a real Array. */
    function $$(selector) {
        return Array.from(document.querySelectorAll(selector));
    }

    /**
     * Create a MutationObserver that watches a single element for
     * attribute or child-text changes and calls `callback` on each.
     * Returns the observer so callers can disconnect if needed.
     */
    function observeElement(element, options, callback) {
        if (!element) {
            return null;
        }
        let observer = new MutationObserver(callback);
        observer.observe(element, options);
        return observer;
    }

    // ── 1. Collapsible Panel Sync ───────────────────────────────────
    //
    // main.js toggles `hidden` on #hiddenBibSection and
    // #advancedOptionsSection.  We watch for that attribute change and
    // mirror the state onto the corresponding .panelHeader button via
    // the `.open` CSS class (which rotates the chevron icon).

    function setupPanelSync() {
        syncPanelHeader("hiddenBibSection", "hiddenBibButton");
        syncPanelHeader("advancedOptionsSection", "advancedOptionsButton");
    }

    function syncPanelHeader(sectionId, buttonId) {
        let section = document.getElementById(sectionId);
        let button = document.getElementById(buttonId);
        if (!section || !button) {
            return;
        }

        // Set initial state based on current hidden value.
        updatePanelHeaderClass(button, section);

        // Watch for changes to the `hidden` attribute.
        observeElement(section, { attributes: true, attributeFilter: ["hidden"] }, function() {
            updatePanelHeaderClass(button, section);
        });
    }

    function updatePanelHeaderClass(button, section) {
        if (section.hidden) {
            button.classList.remove("open");
        } else {
            button.classList.add("open");
        }
    }

    // ── 2. Settings Tab Navigation ──────────────────────────────────
    //
    // The advanced options section uses a tabbed layout.  Nav buttons
    // carry `data-tab` and panels carry `data-panel`.
    //
    // Default active tab: "output".

    function setupSettingsTabs() {
        let navButtons = $$(".settingsNav [data-tab]");
        if (navButtons.length === 0) {
            return;
        }

        navButtons.forEach(function(btn) {
            btn.addEventListener("click", function() {
                activateTab(btn.getAttribute("data-tab"));
            });
        });

        // Activate default tab.
        activateTab("output");
    }

    function activateTab(tabName) {
        // Deactivate all nav buttons, activate the selected one.
        $$(".settingsNav [data-tab]").forEach(function(btn) {
            if (btn.getAttribute("data-tab") === tabName) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });

        // Hide all panels, show the matching one.
        $$(".settingsPanel").forEach(function(panel) {
            if (panel.getAttribute("data-panel") === tabName) {
                panel.hidden = false;
            } else {
                panel.hidden = true;
            }
        });
    }

    // ── 3. Cover Preview (3D Book) ──────────────────────────────────
    //
    // Mirrors the cover image URL into a 3D book visual.  Also syncs
    // title/author text into the placeholder when no cover image is set.

    function setupCoverPreview() {
        let coverInput = document.getElementById("coverImageUrlInput");
        let titleInput = document.getElementById("titleInput");
        let authorInput = document.getElementById("authorInput");
        let clearButton = document.getElementById("clearCoverImageUrlButton");

        if (coverInput) {
            coverInput.addEventListener("input", onCoverImageChange);
        }
        if (titleInput) {
            titleInput.addEventListener("input", onPlaceholderFieldChange);
        }
        if (authorInput) {
            authorInput.addEventListener("input", onPlaceholderFieldChange);
        }
        if (clearButton) {
            clearButton.addEventListener("click", function() {
                // CoverImageUI handles clearing the input value.
                // We schedule our visual update for the next tick so the
                // value is already cleared when we read it.
                setTimeout(onCoverImageChange, 0);
            });
        }

        // Also watch for programmatic value changes (e.g. main.js
        // populateMetaInfo sets titleInput.value directly).  A
        // MutationObserver on `value` doesn't fire for <input>, so we
        // poll lightly using a focused approach: watch the parent
        // container for subtree changes that might signal new data.
        observeElement(document.getElementById("titleInput"), {
            attributes: true
        }, onPlaceholderFieldChange);

        observeElement(document.getElementById("authorInput"), {
            attributes: true
        }, onPlaceholderFieldChange);

        // Apply initial state.
        onCoverImageChange();
        onPlaceholderFieldChange();
    }

    function onCoverImageChange() {
        let coverInput = document.getElementById("coverImageUrlInput");
        let bookCover = document.getElementById("bookCover");
        let placeholder = document.getElementById("bookPlaceholder");

        if (!bookCover) {
            return;
        }

        let url = coverInput ? coverInput.value.trim() : "";

        if (url) {
            bookCover.style.backgroundImage = "url(\"" + url.replace(/"/g, "\\\"") + "\")";
            bookCover.style.backgroundSize = "cover";
            bookCover.style.backgroundPosition = "center";
            if (placeholder) {
                placeholder.hidden = true;
            }
        } else {
            // Revert to the default gradient (defined in CSS).
            bookCover.style.backgroundImage = "";
            bookCover.style.backgroundSize = "";
            bookCover.style.backgroundPosition = "";
            if (placeholder) {
                placeholder.hidden = false;
            }
            // Ensure placeholder text is current.
            onPlaceholderFieldChange();
        }
    }

    function onPlaceholderFieldChange() {
        let titleInput = document.getElementById("titleInput");
        let authorInput = document.getElementById("authorInput");
        let phTitle = document.getElementById("phTitle");
        let phAuthor = document.getElementById("phAuthor");

        if (phTitle) {
            let title = titleInput ? titleInput.value.trim() : "";
            phTitle.textContent = title || "Untitled";
        }
        if (phAuthor) {
            let author = authorInput ? authorInput.value.trim() : "";
            phAuthor.textContent = author || "Anonymous";
        }
    }

    // ── 5. Parser Chip Update ───────────────────────────────────────
    //
    // ChapterUrlsUI sets #spanParserName and #spanDelayMs.  We watch
    // those elements for text changes and update #parserChip.

    function setupParserChipObserver() {
        let parserNameEl = document.getElementById("spanParserName");
        let delayMsEl = document.getElementById("spanDelayMs");

        let updateChip = function() {
            updateParserChip();
        };

        let observerOptions = { childList: true, characterData: true, subtree: true };

        observeElement(parserNameEl, observerOptions, updateChip);
        observeElement(delayMsEl, observerOptions, updateChip);

        // Initial update.
        updateParserChip();
    }

    function updateParserChip() {
        let chip = document.getElementById("parserChip");
        if (!chip) {
            return;
        }

        let parserNameEl = document.getElementById("spanParserName");
        let delayMsEl = document.getElementById("spanDelayMs");

        let parserName = parserNameEl ? parserNameEl.textContent.trim() : "";
        let delay = delayMsEl ? delayMsEl.textContent.trim() : "";

        if (parserName && delay) {
            chip.textContent = parserName + " \u00B7 " + delay;
        } else if (parserName) {
            chip.textContent = parserName;
        } else {
            chip.textContent = "";
        }
    }

    // ── 6. Chapter Subtitle Update ──────────────────────────────────
    //
    // Watch #spanChapterCount for text changes and update
    // #chapterSubtitle with "X selected of Y" style text.

    function setupChapterSubtitleObserver() {
        let chapterCountEl = document.getElementById("spanChapterCount");

        observeElement(chapterCountEl, {
            childList: true,
            characterData: true,
            subtree: true
        }, function() {
            updateChapterSubtitle();
        });

        // Initial update.
        updateChapterSubtitle();
    }

    function updateChapterSubtitle() {
        let subtitle = document.getElementById("chapterSubtitle");
        if (!subtitle) {
            return;
        }

        let chapterCountEl = document.getElementById("spanChapterCount");
        let countText = chapterCountEl ? chapterCountEl.textContent.trim() : "0";

        subtitle.textContent = countText + " selected";
    }

    // ── 7. Colophon Version ─────────────────────────────────────────
    //
    // Fill .colophon with the extension version from the manifest and
    // a count of registered parsers.

    function updateColophon() {
        let colophon = $(".colophon");
        if (!colophon) {
            return;
        }

        let version = "";
        try {
            let manifest = chrome.runtime.getManifest();
            version = manifest.version || "";
        } catch (e) {
            // Not running as extension (e.g. unit tests).
            version = "";
        }

        // Count parsers if parserFactory is available (it loads after us,
        // so we defer this to the next tick or handle it being absent).
        let parserCount = getParserCount();

        let parts = [];
        if (version) {
            parts.push("v" + version);
        }
        if (parserCount > 0) {
            parts.push(parserCount + " parsers");
        }
        colophon.textContent = parts.join(" \u00B7 ");
    }

    function getParserCount() {
        // parserFactory is a global defined in ParserFactory.js.
        // It may not be loaded yet when popup-ui.js initialises, so
        // we also schedule a deferred update.
        if (typeof parserFactory !== "undefined" && parserFactory.parsers) {
            return parserFactory.parsers.size;
        }
        return 0;
    }

    /**
     * Re-attempt colophon update once the rest of the scripts have loaded.
     * Called from a window load listener so parserFactory is available.
     */
    function deferredColophonUpdate() {
        window.addEventListener("load", function() {
            updateColophon();
        });
    }

    // ── Initialisation ──────────────────────────────────────────────

    function init() {
        setupPanelSync();
        setupSettingsTabs();
        setupCoverPreview();
        setupParserChipObserver();
        setupChapterSubtitleObserver();
        updateColophon();
        deferredColophonUpdate();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    return {
        init: init,
        activateTab: activateTab,
        updateColophon: updateColophon
    };
})();
