'use strict';
const { Notification } = require('../models');

let io = null;

const setIo = (socketIo) => { io = socketIo; };

/**
 * Create notification and push via Socket.IO
 */
const notify = async ({ user_id, type, title, body, link }) => {
  const notif = await Notification.create({ user_id, type, title, body, link });
  if (io) {
    io.to(`user:${user_id}`).emit('notification', {
      id: notif.id, type, title, body, link, is_read: false, created_at: notif.created_at,
    });
  }
  return notif;
};

/**
 * Notify multiple users
 */
const notifyMany = async (userIds, { type, title, body, link }) => {
  if (!userIds || userIds.length === 0) return [];

  // Use allSettled so one bad user_id doesn't abort the whole batch
  const settled = await Promise.allSettled(
    userIds.map((user_id) => Notification.create({ user_id, type, title, body, link }))
  );

  const notifications = [];
  settled.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      notifications.push({ uid: userIds[i], notif: result.value });
    } else {
      console.error(`notifyMany failed for user ${userIds[i]}:`, result.reason?.message);
    }
  });

  if (io) {
    notifications.forEach(({ uid, notif }) => {
      io.to(`user:${uid}`).emit('notification', {
        id: notif.id, type, title, body, link, is_read: false, created_at: notif.created_at,
      });
    });
  }
  return notifications.map((n) => n.notif);
};

module.exports = { setIo, notify, notifyMany };
