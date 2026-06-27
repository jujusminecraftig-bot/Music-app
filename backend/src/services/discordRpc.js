const RPC = require('discord-rpc');

let client;
let activityInterval;
let currentActivity = null;
let reconnectTimeout;
let destroyed = false;

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;

function start() {
  if (!CLIENT_ID) return;
  if (client) return;

  destroyed = false;

  client = new RPC.Client({ transport: 'ipc' });

  client.on('ready', () => {
    console.log('[Discord RPC] Connected');
    if (currentActivity) {
      setActivity(currentActivity);
    }
  });

  client.on('disconnected', () => {
    console.log('[Discord RPC] Disconnected');
    client = null;
    if (!destroyed) {
      reconnectTimeout = setTimeout(start, 10000);
    }
  });

  try {
    client.login({ clientId: CLIENT_ID }).catch(() => {
      client = null;
    });
  } catch {
    client = null;
  }
}

function setActivity(activity) {
  if (!client || !client.user) return;

  currentActivity = activity;

  const timestamps = {};
  if (activity.startTimestamp) timestamps.start = activity.startTimestamp;
  if (activity.endTimestamp) timestamps.end = activity.endTimestamp;

  const assets = {};
  if (activity.largeImageKey) assets.large_image = activity.largeImageKey;
  if (activity.largeImageText) assets.large_text = activity.largeImageText;
  if (activity.smallImageKey) assets.small_image = activity.smallImageKey;
  if (activity.smallImageText) assets.small_text = activity.smallImageText;

  const payload = {
    pid: process.pid,
    activity: {
      type: 2,
      name: 'LetsListenToMusic',
      instance: false,
    },
  };

  if (activity.details) payload.activity.details = activity.details.substring(0, 128);
  if (activity.state) payload.activity.state = activity.state.substring(0, 128);
  if (Object.keys(timestamps).length) payload.activity.timestamps = timestamps;
  if (Object.keys(assets).length) payload.activity.assets = assets;
  if (activity.url) {
    payload.activity.buttons = [{ label: 'Listen Along', url: activity.url }];
  }

  client.request('SET_ACTIVITY', payload).catch((err) => {
    console.error('[Discord RPC] setActivity failed:', err?.message || err);
  });
}

function clearActivity() {
  if (!client || !client.user) return;
  currentActivity = null;
  client.request('SET_ACTIVITY', { pid: process.pid }).catch(() => {});
}

function destroy() {
  destroyed = true;
  clearInterval(activityInterval);
  clearTimeout(reconnectTimeout);
  if (client) {
    client.destroy().catch(() => {});
    client = null;
  }
}

module.exports = { start, setActivity, clearActivity, destroy };
