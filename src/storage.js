/** saves extension settings in the local storage */
async function updateSettings() {
    await browser.storage.sync.set({
        settings: settings,
    });
}

/** hard reset in storage if needed. */
async function deleteStorage() {
    await browser.storage.local.clear();
}

/** loads settings from the sync storage */
async function getSettings() {
    const { settings: loadedSettings } =
    await browser.storage.sync.get("settings");
    const updatedSettings = { ...settings, ...loadedSettings };
    Object.assign(settings, updatedSettings);
}

async function cacheMetadata(tabId, metadata) {
    const cachedData = await browser.storage.local.get('youtubeMetadata') || {};
    cachedData[tabId] = metadata;
    await browser.storage.local.set({ youtubeMetadata: cachedData });
}

async function getCachedMetadata(tabId) {
    const cachedData = await browser.storage.local.get('youtubeMetadata');
    return cachedData.youtubeMetadata ? cachedData.youtubeMetadata[tabId] : null;
}

// Using sync storage to sync data across devices
async function cacheMetadataSync(tabId, metadata) {
    const cachedData = await browser.storage.sync.get('youtubeMetadata') || {};
    cachedData[tabId] = metadata;
    await browser.storage.sync.set({ youtubeMetadata: cachedData });
}
