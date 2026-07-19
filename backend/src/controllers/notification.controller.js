const Notification = require('../models/Notification');
const { ApiResponse } = require('../utils/ApiResponse');
const { ApiError } = require('../utils/ApiError');
const { parsePagination, buildPaginationMeta } = require('../utils/helpers');

const getNotifications = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const query = { userId: req.user._id };
    if (req.query.unread === 'true') query.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ userId: req.user._id, isRead: false }),
    ]);

    res.json(
      ApiResponse.paginated('Notifications retrieved.', notifications, {
        ...buildPaginationMeta(total, page, limit),
        unreadCount,
      })
    );
  } catch (err) { next(err); }
};

const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    );
    if (!notification) throw ApiError.notFound('Notification');
    res.json(ApiResponse.success('Notification marked as read.', { notification }));
  } catch (err) { next(err); }
};

const markAllAsRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
    res.json(ApiResponse.success(`${result.modifiedCount} notifications marked as read.`));
  } catch (err) { next(err); }
};

const deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!notification) throw ApiError.notFound('Notification');
    res.json(ApiResponse.success('Notification deleted.'));
  } catch (err) { next(err); }
};

module.exports = { getNotifications, markAsRead, markAllAsRead, deleteNotification };
