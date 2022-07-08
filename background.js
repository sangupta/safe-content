/**
 * Page to show when we cannot modify loaded page contents
 * because content.js has not yet been injected.
 */
const BLOCKING_PAGE = 'https://sangupta.com/hosted';

/**
 * Are we in debug mode?
 */
const DEBUG_MODE = true;

const blocked = {
    videos: new Set(),
    users: new Set(),
    channels: new Set(),
    c: new Set()
};

function addToSet(set, items) {
    if (!items || items.length === 0) {
        return;
    }

    items.forEach(item => {
        set.add(item);
    });
}

/**
 * List of all blocked videos/users/channels etc. This needs
 * to come from a web URL
 */
async function loadBlockingMetadata() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/sangupta/safe-content/main/blocked.json');
        const json = await response.json();

        debug('Blocking metadata loaded successfully.');
        addToSet(blocked.videos, json.videos);
        addToSet(blocked.users, json.users);
        addToSet(blocked.channels, json.channels);
        addToSet(blocked.c, json.c);
    } catch (e) {
        // eat up
    }
}

loadBlockingMetadata();

/**
 * Helper debug function
 */
function debug() {
    if (DEBUG_MODE) {
        console.log.apply(undefined, [...arguments]);
    }
}

/**
 * Block a tab.
 * 
 * @param {*} tabID 
 * @returns 
 */
async function blockTabID(tabID) {
    debug('block tabid: ', tabID);
    try {
        const response = await chrome.tabs.sendMessage(tabID, { id: 'blockTab' });
        debug(response);
        return response;
    } catch (e) {
        // this happens when the content script has not yet injected into page
        // in which case we update the URL to our hosted blocking page
        showHostedBlocker(tabID);
    }
}

/**
 * Show hosted blocker page.
 * 
 * @param {*} tabID 
 */
function showHostedBlocker(tabID) {
    const updateProperties = {
        url: 'https://sangupta.com/hosted/'
    }

    chrome.tabs.update(tabID, updateProperties, function (tab) {
        debug('hosted blocker page shown');
    });
}

/**
 * Refer https://developer.chrome.com/docs/extensions/reference/tabs/#event-onCreated
 * 
 * @param {Tab} tab 
 */
function newTabCreated(tab) {
    debug('tab created with url: ', tab.url);
    const isBlocked = shouldBlock(tab.url);
    if (isBlocked) {
        showHostedBlocker(tab.id);
    }
}

/**
 * Refer https://developer.chrome.com/docs/extensions/reference/tabs/#event-onUpdated
 * 
 * @param {number} tabID 
 * @param {object} changeInfo 
 * @param {Tab} tab 
 */
function tabUpdated(tabID, changeInfo, tab) {
    const url = changeInfo.url;
    debug('tab updated to url: ', url);
    const isBlocked = shouldBlock(url);
    if (isBlocked) {
        blockTabID(tabID);
    }
}

/**
 * Check if the video/user/channel has to be blocked.
 * 
 * @param {*} url 
 * @returns 
 */
function shouldBlock(url) {
    if (!url) {
        return false;
    }

    const urlObject = new URL(url);
    const host = urlObject.hostname;
    const path = urlObject.pathname;

    debug('found path: ', path);

    if (!host.includes('youtube')) {
        debug('not youtube url, skipping: ', host);
        return false;
    }

    // block videos
    if (path.startsWith('/watch')) {
        const videoID = new URLSearchParams(urlObject.search).get('v');
        debug('video id is: ', videoID);
        if (blocked.videos.has(videoID)) {
            debug('blocking video with id: ', videoID);
            return true;
        }
    }

    // block user
    if (path.startsWith('/user/')) {
        // check against blocked users
        const user = path.substring('/user/'.length);
        debug('user id is: ', user);
        if (blocked.users.has(user)) {
            debug('blocking user with id: ', user);
            return true;
        }
    }

    // block channel
    if (path.startsWith('/channel/')) {
        const channel = path.substring('/channel/'.length);
        debug('channel id is: ', channel);
        if (blocked.channels.has(channel)) {
            debug('blocking channel with id: ', channel);
            return true;
        }
    }

    // block channel
    if (path.startsWith('/c/')) {
        const channel = path.substring('/c/'.length);
        debug('channel id is: ', channel);
        if (blocked.c.has(channel)) {
            debug('blocking channel with id: ', channel);
            return true;
        }
    }

    // video not blocked via id/user/channel
    return false;
}

// handle when a new tab is created
chrome.tabs.onCreated.addListener(newTabCreated);

// handle when tabs are updated
chrome.tabs.onUpdated.addListener(tabUpdated);
