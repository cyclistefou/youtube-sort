/** returns merged tab and video data, remaps to an array, filters based on settings, filters if selected.
 *    TODO: merged data includes more stuff than I actually need. Also removes data from storage. Not sure if that's better somewhere else
 */
async function prefilterTabs() {
    const videoTabs = await browser.storage.local.get();
    const allTabs = await browser.tabs.query({
        pinned: false,
        url: "*://*.youtube.com/*",
    });

    const mergedTabData = {};
    // merges firefoxTab info and youtubeTab info and adjusts attribute-names
    allTabs.forEach((tab) => {
        const youtubeID = extractYouTubeID(tab.url);
        if (youtubeID) {
            const key = `${youtubeID}-${tab.id}`;
            mergedTabData[key] = {
                sleepy: tab.discarded,
                selected: tab.highlighted,
                tabTitle: tab.title,
                liveDuration:
                videoTabs[youtubeID]?.live ??
                videoTabs[youtubeID]?.skipped ??
                videoTabs[youtubeID]?.duration,
                ...(typeof youtubeID == "string" && youtubeID.length == 11
                ? { youtubeID: youtubeID }
                : {}),
                ...tab,
                ...videoTabs[youtubeID],
            };
        }
    });

    // remap to an array
    const tabArray = Object.entries(mergedTabData).map((tab) => {
        return {
            tabId: tab[0],
            ...tab[1],
        };
    });

    // filter tabs based on settings
    const filteredTabs = tabArray.filter((tab) => {
        return (
            tab.youtubeID &&
            tab.title &&
            (!settings.ignore_playlists || !tab.playlist) &&
            (!settings.ignore_live || !tab.live) &&
            (!settings.ignore_inactive || !tab.sleepy)
        );
    });

    // removes entries from storage that can not be found anymore
    filteredTabs.forEach(async (tab) => {
        if (!tab.title || !tab.id) {
            await browser.storage.local.remove(tab.youtubeID);
        }
    });

    // filters other tabs if at least two have been selected, and return them
    const selectedTabs = filteredTabs.filter((tab) => tab.selected);
    return selectedTabs.length > 1 ? selectedTabs : filteredTabs;
}

/** sorts tabs based on settings. */
async function sortTabs() {
    document.getElementById("tab-button-sort").classList.add("loading");
    document.getElementById("alert-error").innerText = "";

    try {
        const tabs = await prefilterTabs();

        // wake them up, if wanted
        if (settings.force_reload) {
            tabs.forEach((tab) => {
                browser.tabs.reload(tab.id);
            });
        }

        const sortedTabs = tabs.sort((a, b) => {
            for (const sorting of settings.sorting) {
                const criteria =
                sorting.attr === "duration" ? "liveDuration" : sorting.attr;
                const critA =
                typeof a[criteria] === "string"
                ? a[criteria].toLowerCase()
                : a[criteria];
                const critB =
                typeof b[criteria] === "string"
                ? b[criteria].toLowerCase()
                : b[criteria];
                let res = String(critA).localeCompare(critB, undefined, {
                    numeric: true,
                });
                if (sorting.asc === true && res !== 0) res = -res;
                if (res !== 0) return res;
            }
        });

        sortedTabs.forEach(async (tab) => {
            browser.tabs.move(tab.id, { index: -1 });
        });
        renderList();

        // wake them up, if wanted
        if (settings.ignore_inactive !== true) {
            sortedTabs.forEach((tab) => {
                if (tab.sleepy) browser.tabs.reload(tab.id);
            });
        }
    } catch (error) {
        console.debug("[YouTube Sort]", error);
        document.getElementById("alert-error").innerText = "Error: " + error;
    } finally {
        document.getElementById("tab-button-sort").classList.remove("loading");
    }
}

async function updateStats(tabs) {
    document.getElementById("stat_tabs").innerText = tabs.length;
    document.getElementById("stat_duration").innerText = getDuration(
        tabs.reduce((acc, tab) => {
            return (
                acc +
                (settings.sort_sponsorblock
                ? (tab?.skipped ?? tab.duration)
                : tab.duration)
            );
        }, 0),
    );
    document.getElementById("stat_views").innerText = getViews(
        tabs.reduce((acc, tab) => {
            return acc + tab.views;
        }, 0),
    );
}

async function loadTab(tabId) {
    const tab = await browser.tabs.get(tabId);
    const storedUrl = await browser.storage.local.get(tabId);
    if (storedUrl[tabId]) {
        await browser.tabs.update(tabId, { url: storedUrl[tabId] });
    }
}

async function unloadTab(tabId) {
    await browser.tabs.discard(tabId);
    // You could save the current URL in extension storage for later reloading.
    const tab = await browser.tabs.get(tabId);
    browser.storage.local.set({ [tabId]: tab.url });
}
