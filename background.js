/**
 * Page to show when we cannot modify loaded page contents
 * because content.js has not yet been injected.
 */
const BLOCKING_PAGE = 'https://sangupta.com/hosted';

/**
 * Are we in debug mode?
 */
const DEBUG_MODE = true;

/**
 * List of all blocked videos/users/channels etc. This needs
 * to come from a web URL
 */
const blocked = {
    videos: [
        "k01Pm-5h89k"
    ],
    users: [
        "officialEdwardMaya"
    ],
    channels: [
        "UCBXNpF6k2n8dsI6nBH8q4sQ"
    ],
    keywords: [
        "adopted",
        "123 go"
    ]
}

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
        if (blocked.videos.includes(videoID)) {
            debug('blocking video with id: ', videoID);
            return true;
        }
    }

    // block user
    if (path.startsWith('/user/')) {
        // check against blocked users
        const user = path.substring('/user/'.length);
        debug('user id is: ', user);
        if (blocked.users.includes(user)) {
            debug('blocking user with id: ', user);
            return true;
        }
    }

    // block channel
    if (path.startsWith('/channel/')) {
        const channel = path.substring('/channel/'.length);
        debug('channel id is: ', channel);
        if (blocked.channels.includes(channel)) {
            debug('blocking channel with id: ', channel);
            return true;
        }
    }

    // block channel
    if (path.startsWith('/c/')) {
        const channel = path.substring('/c/'.length);
        debug('channel id is: ', channel);
        if (blocked.channels.includes(channel)) {
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
