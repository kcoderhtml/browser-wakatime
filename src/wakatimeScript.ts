import { getSite } from './utils/sites';

const oneMinute = 60000;
const fiveMinutes = 300000;

/**
 * Debounces the execution of a function.
 *
 * @param {() => void} func - The function to debounce.
 * @param {number} [timeout] - The timeout for the debounce in milliseconds.
 * @param {number} [maxWaitTime] - The max time to debounce before forcing execution in milliseconds.
 * @returns {() => void} The debounced function.
 */
function debounce(func: () => void, timeout = oneMinute, maxWaitTime = fiveMinutes) {
  let timer: NodeJS.Timeout | undefined;
  let lastExecutionTime: number | undefined;
  return (...args: unknown[]) => {
    clearTimeout(timer);
    if (lastExecutionTime && lastExecutionTime + maxWaitTime < Date.now()) {
      lastExecutionTime = Date.now();
      func(...(args as []));
    }
    timer = setTimeout(() => {
      lastExecutionTime = Date.now();
      func(...(args as []));
    }, timeout);
  };
}

const sendHeartbeat = debounce(async () => {
  chrome.runtime.sendMessage({ task: 'handleActivity' });
});

chrome.runtime.onMessage.addListener(
  (request: { task: string; url: string }, sender, sendResponse) => {
    if (request.task === 'getHeartbeatFromPage') {
      const site = getSite(request.url);
      if (!site) {
        sendResponse({ heartbeat: undefined });
        return;
      }

      sendResponse({ heartbeat: site.parser(request.url) });
    }
  },
);

document.body.addEventListener('click', sendHeartbeat, true);

document.body.addEventListener('keypress', sendHeartbeat, true);

const checkIfInAMeeting = () => {
  if (!window.location.href.startsWith('https://meet.google.com/')) {
    return;
  }

  const isActiveMeeting = !!document.querySelector('[data-meeting-title]');
  if (isActiveMeeting) {
    sendHeartbeat();
  }

  setTimeout(checkIfInAMeeting, oneMinute);
};

// Google Meet
checkIfInAMeeting();
