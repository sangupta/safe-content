/**
 * This file lives within the youtube.com pages
 * and allows us to block the content. This will remove
 * videos from home page, search results, and side bar
 * suggestions that do match a pre-defined list.
 */

/**
 * Remove blocked videos from content.
 * 
 */
async function removeBlockedVideos() {
    // block channel/user videos
    const url = new URL(window.location);
    const path = url.pathname;
    const tab = await getCurrentTab();
    if (path.startsWith('/watch')) {
        setTimeout(() => {
            const channelName = document.querySelector('ytd-channel-name');
            if (channelName) {
                const link = channelName.querySelector('a');
                if (link) {
                    chrome.runtime.sendMessage({ id: 'checkBlocking', link: link.getAttribute('href'), tabID: tab.id }, function (response) {
                        console.log('response from block check: ', response);

                        if (response && response.blocked === true) {
                            displayBlockingNotice();
                            return;
                        }
                    })
                }
            }

        }, 2000);
        return;
    }

    // remove from search
    const elements = document.querySelector('ytd-rich-grid-media');
    if (elements) {
        for (let index = 0; index < elements.length; index++) {
            const element = elements[index];

            const anchor = element.querySelector('.video-title-link');
            if (anchor && anchor.length > 0) {
                const title = anchor[0].innerText;
                if (title.includes('123 go')) {
                    // delete the video
                    element.remove();
                }
            }
        }
    }
}

async function getCurrentTab() {
    const queryOptions = { active: true, lastFocusedWindow: true };
    // `tab` will either be a `tabs.Tab` instance or `undefined`.
    const [tab] = await chrome.tabs.query(queryOptions);
    return tab;
}

// call immediately as and when page is loaded
removeBlockedVideos();

/**
 * Display a blocking notice to user.
 */
function displayBlockingNotice() {
    const div = document.createElement('div');
    div.style.margin = '20px';
    div.style.fontSize = '18px';
    div.innerText = 'This page has been blocked for access on parental guidance.';

    document.body.innerHTML = '';
    document.body.appendChild(div);
}

/**
 * Receive messages from background.js on what action
 * needs to be performed.
 * 
 */
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        console.log('message receveied as: ', request);
        if (request.id === 'blockTab') {
            displayBlockingNotice();
            sendResponse({ blocked: true });
            return;
        }

        sendResponse({ error: 'unknown message type' });
    }
);
