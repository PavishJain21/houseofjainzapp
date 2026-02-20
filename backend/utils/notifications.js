const supabase = require('../config/supabase');

/**
 * Create a notification for a user
 * @param {string} userId - User ID to notify
 * @param {string} type - Notification type (order_placed, order_status_changed, etc.)
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {object} data - Additional data (order_id, post_id, etc.)
 */
async function createNotification(userId, type, title, message, data = {}) {
  try {
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert([
        {
          user_id: userId,
          type,
          title,
          message,
          data,
          is_read: false,
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return null;
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

/**
 * Create notification when order is placed (notify seller)
 */
async function notifyOrderPlaced(order, shopOwnerId) {
  const orderId = order.id.slice(0, 8);
  return await createNotification(
    shopOwnerId,
    'order_placed',
    'New Order Received',
    `You have received a new order #${orderId}`,
    { order_id: order.id, order_number: orderId }
  );
}

/**
 * Create notification when order status changes (notify customer)
 */
async function notifyOrderStatusChanged(order, customerId, newStatus, oldStatus) {
  const orderId = order.id.slice(0, 8);
  const statusMessages = {
    confirmed: 'Your order has been confirmed',
    processing: 'Your order is being processed',
    shipped: 'Your order has been shipped',
    delivered: 'Your order has been delivered',
    cancelled: 'Your order has been cancelled',
  };

  return await createNotification(
    customerId,
    'order_status_changed',
    'Order Status Updated',
    `Order #${orderId}: ${statusMessages[newStatus] || 'Status updated'}`,
    { order_id: order.id, order_number: orderId, new_status: newStatus, old_status: oldStatus }
  );
}

module.exports = {
  createNotification,
  notifyOrderPlaced,
  notifyOrderStatusChanged,
};

