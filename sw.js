// ========== 穗穗机 Service Worker ==========
// 版本号，更新时修改这个来强制刷新缓存
const VERSION = 'suisuiji-sw-v1';

// ===== 安装：缓存核心资源 =====
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

// ===== 后台推送消息处理 =====
self.addEventListener('push', event => {
  if (!event.data) return;

  let data;
  try { data = event.data.json(); }
  catch (e) { data = { title: '新消息', body: event.data.text(), icon: '' }; }

  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'suisuiji-push',
    data: { url: data.url || '/', roleId: data.roleId || '' },
    vibrate: [100, 50, 100],
    requireInteraction: false,
    silent: false,
    actions: [
      { action: 'reply', title: '回复' },
      { action: 'close', title: '关闭' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '穗穗机', options)
  );
});

// ===== 点击通知：跳转到聊天页 =====
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'close') return;

  const roleId = event.notification.data?.roleId || '';
  const targetUrl = self.registration.scope + (roleId ? '#chat=' + roleId : '');

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // 如果已经有窗口打开，聚焦它
      for (const client of clients) {
        if (client.url.startsWith(self.registration.scope)) {
          client.focus();
          client.postMessage({ type: 'OPEN_CHAT', roleId });
          return;
        }
      }
      // 否则打开新窗口
      return self.clients.openWindow(targetUrl);
    })
  );
});

// ===== 定时任务：角色主动发消息（通过 postMessage 触发）=====
self.addEventListener('message', event => {
  if (!event.data) return;

  // 页面发来"要显示通知"的指令（不依赖 Push Server，纯本地）
  if (event.data.type === 'SHOW_LOCAL_NOTIFICATION') {
    const { title, body, icon, tag, roleId } = event.data;
    self.registration.showNotification(title || '穗穗机', {
      body: body || '',
      icon: icon || '/icon-192.png',
      badge: '/icon-192.png',
      tag: tag || 'local-' + Date.now(),
      data: { roleId: roleId || '' },
      vibrate: [80, 40, 80],
      requireInteraction: false,
    });
  }
});
