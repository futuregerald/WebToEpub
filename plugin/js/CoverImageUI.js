"use strict";

/** Class that handles UI for selecting cover image */
class CoverImageUI { // eslint-disable-line no-unused-vars
    constructor() {
    }

    static getImageTableElement() {
        return document.getElementById("imagesTable");
    }

    /** return URL of image to use for cover, or NULL if no cover
    */
    static getCoverImageUrl() {
        let url = CoverImageUI.getCoverImageUrlInput().value;
        return util.isNullOrEmpty(url) ? null : url;
    }

    /** toggle visibility of the Cover Image URL input control
     * @param {bool} visible - show/hide control
    */
    static showCoverImageUrlInput(visible) {
        document.getElementById("coverUrlSection").hidden = !visible;
        document.getElementById("imagesTableDiv").hidden = visible;
    }

    /** clear all UI elements associated with selecting the Cover Image */
    static clearUI() {
        CoverImageUI.clearImageTable();
        CoverImageUI.setCoverImageUrl("");
    }

    /** remove all images from the table of images to pick from */
    static clearImageTable() {
        let imagesTable = CoverImageUI.getImageTableElement();
        while (imagesTable.children.length > 0) {
            imagesTable.removeChild(imagesTable.children[imagesTable.children.length - 1]);
        }
    }

    /** create table of images for user to pick from
    * @param {array of ImageInfo} images to populate table with
    */
    static populateImageTable(images) {
        CoverImageUI.clearImageTable();
        let imagesTable = CoverImageUI.getImageTableElement();
        let checkBoxIndex = 0;
        if (0 === images.length) {
            imagesTable.parentElement.appendChild(document.createTextNode(UIText.CoverImage.noImagesFoundLabel));
        }
        else {
            images.forEach((imageInfo) => {
                let row = document.createElement("tr");

                // add checkbox
                let checkbox = CoverImageUI.createCheckBoxAndLabel(imageInfo.sourceUrl, checkBoxIndex);
                CoverImageUI.appendColumnToRow(row, checkbox);

                // add image
                let img = document.createElement("img");
                img.setAttribute("style", "max-height: 120px; width: auto; ");
                img.src = imageInfo.sourceUrl;
                CoverImageUI.appendColumnToRow(row, img);
                imagesTable.appendChild(row);

                ++checkBoxIndex;
            });
        }
    }

    /** adds row to the images table
    * @private
    */
    static createCheckBoxAndLabel(sourceUrl, checkBoxIndex) {
        let label = document.createElement("label");
        let checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = "setCoverCheckBox" + checkBoxIndex;
        checkbox.onclick = () => { CoverImageUI.onImageClicked(checkbox.id, sourceUrl); };
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(UIText.CoverImage.setCover));

        // default to first image as cover image
        if (checkBoxIndex === 0) {
            CoverImageUI.setCoverImageUrl(sourceUrl);
            checkbox.checked = true;
        }
        return label;
    }

    /** user has selected/unselected an image for cover
    * @private
    */
    static onImageClicked(checkboxId, sourceUrl) {
        let checkbox = document.getElementById(checkboxId);
        if (checkbox.checked === true) {
            CoverImageUI.setCoverImageUrl(sourceUrl);

            // uncheck any other checked boxes
            let imagesTable = CoverImageUI.getImageTableElement();
            for (let box of imagesTable.querySelectorAll("input")) {
                if (box.id !== checkboxId) {
                    box.checked = false;
                }
            }
        } else {
            CoverImageUI.setCoverImageUrl(null);
        }
    }

    /**
    * @private
    */
    static appendColumnToRow(row, element) {
        let col = document.createElement("td");
        col.appendChild(element);
        col.style.whiteSpace = "nowrap";
        row.appendChild(col);
        return col;
    }

    /**
    * @private
    * @todo  this should be moved to Baka-Tsuki, this logic is specific to B-T
    */
    static onCoverFromUrlClick(enable, images) {
        if (enable) {
            CoverImageUI.setCoverImageUrl(null);
            CoverImageUI.clearImageTable();
            CoverImageUI.showCoverImageUrlInput(true);
        } else {
            CoverImageUI.showCoverImageUrlInput(false);
            CoverImageUI.populateImageTable(images);
        }
    }

    /** user has selected/unselected an image for cover
    * @private
    */
    static getCoverImageUrlInput() {
        return document.getElementById("coverImageUrlInput");
    }

    /** @private */
    static getSampleCoverImg() {
        return document.getElementById("sampleCoverImg");
    }

    /** set URL of image to use for cover, or NULL if no cover
    * @public
    */
    static setCoverImageUrl(url) {
        // When a non-blob URL is set (e.g. parser resets cover), clear local data
        if (!url || !url.startsWith("blob:")) {
            CoverImageUI.clearLocalCoverData();
        }
        let inputUrl = CoverImageUI.getCoverImageUrlInput();
        if (inputUrl.onchange == null) {
            inputUrl.onchange = CoverImageUI.showSampleImg;
        }
        inputUrl.value = url;
        CoverImageUI.getSampleCoverImg().src = url;
        inputUrl.dispatchEvent(new Event("input", { bubbles: true }));
    }

    /** @private */
    static showSampleImg() {
        let url = CoverImageUI.getCoverImageUrlInput().value;
        let sampleImg = CoverImageUI.getSampleCoverImg();
        sampleImg.src = url;
    }

    /** Stores local file data: { file, mediaType, fileName, blobUrl } or null */
    static localCoverData = null;

    /** Maximum allowed file size in bytes (10 MB) */
    static MAX_FILE_SIZE = 10 * 1024 * 1024;

    /** Set up drag-drop and browse-file support on the cover stage
    * @param {Element} coverStage - the .coverStage element
    */
    static setupLocalFileUpload(coverStage) {
        if (!coverStage) return;

        let overlay = document.getElementById("coverDropOverlay");
        let browseLink = document.getElementById("coverBrowseLink");
        let fileInput = document.getElementById("coverFileInput");
        let dragCounter = 0;

        function showOverlay() {
            if (overlay) overlay.hidden = false;
        }

        function hideOverlay() {
            if (overlay) overlay.hidden = true;
        }

        coverStage.addEventListener("dragenter", function(e) {
            e.preventDefault();
            dragCounter++;
            if (dragCounter > 0) showOverlay();
        });

        coverStage.addEventListener("dragleave", function(e) {
            e.preventDefault();
            dragCounter--;
            if (dragCounter <= 0) {
                dragCounter = 0;
                hideOverlay();
            }
        });

        coverStage.addEventListener("dragover", function(e) {
            e.preventDefault();
        });

        coverStage.addEventListener("drop", function(e) {
            e.preventDefault();
            dragCounter = 0;
            hideOverlay();
            let files = e.dataTransfer.files;
            if (files.length > 0) {
                let file = files[0];
                if (!file.type.startsWith("image/")) {
                    return; // silently reject non-image files
                }
                if (file.size > CoverImageUI.MAX_FILE_SIZE) {
                    ErrorLog.showErrorMessage("Cover image file is too large (max 10 MB).");
                    return;
                }
                CoverImageUI.loadLocalFile(file);
            }
        });

        if (browseLink && fileInput) {
            browseLink.addEventListener("click", function() {
                fileInput.click();
            });

            fileInput.addEventListener("change", function() {
                if (fileInput.files.length > 0) {
                    let file = fileInput.files[0];
                    if (!file.type.startsWith("image/")) {
                        return;
                    }
                    if (file.size > CoverImageUI.MAX_FILE_SIZE) {
                        ErrorLog.showErrorMessage("Cover image file is too large (max 10 MB).");
                        return;
                    }
                    CoverImageUI.loadLocalFile(file);
                }
            });
        }
    }

    /** Load a local image file as the cover
    * @param {File} file - the image file to use
    */
    static loadLocalFile(file) {
        // Revoke any previous blob URL to prevent memory leaks
        if (CoverImageUI.localCoverData && CoverImageUI.localCoverData.blobUrl) {
            URL.revokeObjectURL(CoverImageUI.localCoverData.blobUrl);
        }

        let blobUrl = URL.createObjectURL(file);
        CoverImageUI.localCoverData = {
            file: file,
            mediaType: file.type,
            fileName: file.name,
            blobUrl: blobUrl
        };

        // Set blob URL in the cover input (triggers preview update)
        let inputUrl = CoverImageUI.getCoverImageUrlInput();
        if (inputUrl.onchange == null) {
            inputUrl.onchange = CoverImageUI.showSampleImg;
        }
        inputUrl.value = blobUrl;
        inputUrl.readOnly = true;
        inputUrl.title = file.name;
        inputUrl.placeholder = file.name;
        CoverImageUI.getSampleCoverImg().src = blobUrl;
        inputUrl.dispatchEvent(new Event("input", { bubbles: true }));
    }

    /** Clear local cover data and re-enable URL input
    * @public
    */
    static clearLocalCoverData() {
        if (CoverImageUI.localCoverData) {
            if (CoverImageUI.localCoverData.blobUrl) {
                URL.revokeObjectURL(CoverImageUI.localCoverData.blobUrl);
            }
            CoverImageUI.localCoverData = null;
        }
        let inputUrl = CoverImageUI.getCoverImageUrlInput();
        if (inputUrl) {
            inputUrl.readOnly = false;
            inputUrl.title = "";
            inputUrl.placeholder = "https://...cover.jpg";
        }
        let fileInput = document.getElementById("coverFileInput");
        if (fileInput) {
            fileInput.value = "";
        }
    }
}
