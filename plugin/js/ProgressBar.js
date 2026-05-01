
"use strict";

/**
   Code to manipulate the Progress Bar on the UI
*/
class ProgressBar { // eslint-disable-line no-unused-vars
    constructor() {
    }

    static getUiElement() {
        return document.getElementById("fetchProgress");
    }

    static setValue(value) {
        ProgressBar.getUiElement().value = value;
        ProgressBar.updateText();
        ProgressBar.updateVisualBar();
    }

    static updateValue(increment) {
        ProgressBar.getUiElement().value += increment;
        ProgressBar.updateText();
        ProgressBar.updateVisualBar();
    }

    static setMax(max) {
        ProgressBar.getUiElement().max = max;
        ProgressBar.updateText();
        ProgressBar.updateVisualBar();
    }

    static updateText() {
        let element = ProgressBar.getUiElement();
        let text = "";
        if (1 < element.max) {
            text = `${element.value}/${element.max}`;
            ProgressBar.updateTabTitle(element.value, element.max);
        }
        document.getElementById("progressString").textContent = text;
    }

    static updateTabTitle(value, max) {
        value = (value*100/max).toFixed(1);
        if (value == "100.0") {
            value = "100";
        }
        document.title = value + "% WebToEpub";
    }

    /** Sync the hidden <progress> element state to the visual progress bar */
    static updateVisualBar() {
        let element = ProgressBar.getUiElement();
        let fill = document.getElementById("progressFill");
        let label = document.getElementById("progressLabel");
        let pct = document.getElementById("progressPct");
        if (!fill) return;

        let percent = 0;
        if (element.max > 0) {
            percent = Math.min(100, (element.value / element.max) * 100);
        }
        fill.style.width = percent.toFixed(1) + "%";

        if (pct) {
            pct.textContent = Math.round(percent) + "%";
        }

        if (label) {
            if (element.value <= 0 || element.max <= 1) {
                label.textContent = "Ready to bind";
            } else if (element.value >= element.max) {
                label.textContent = "Done. EPUB ready to download.";
            } else {
                label.textContent = `Fetching chapter ${element.value} of ${element.max}\u2026`;
            }
        }
    }
}
