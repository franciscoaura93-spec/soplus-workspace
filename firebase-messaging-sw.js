importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyCEZO2Haz9W2OFmecNJG2wk6nicjpQvTTI",
    authDomain: "s123o-f3e37.firebaseapp.com",
    databaseURL: "https://s123o-f3e37-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "s123o-f3e37",
    storageBucket: "s123o-f3e37.firebasestorage.app",
    messagingSenderId: "714841609825",
    appId: "1:714841609825:web:9a229c4679b11fdf1cbc20"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
    const { title, body, icon, click_action } = payload.data || {};
    self.registration.showNotification(title || 'S&O+ Ultra Workspace', {
        body: body || 'Nova atualização disponível!',
        icon: icon || '/static/favicon.ico',
        data: { click_action },
        badge: '/static/favicon.ico',
        vibrate: [200, 100, 200],
        requireInteraction: true
    });
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    const action = event.notification.data?.click_action || '/app';
    event.waitUntil(clients.openWindow(action));
});
