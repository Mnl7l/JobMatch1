// src/services/notificationService.js
import { supabase } from '../utils/supabaseClient';

/**
 * Service for managing user notifications
 */
class NotificationService {
  /**
   * Get notifications for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of notifications
   */
  static async getUserNotifications(userId) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching notifications:', error.message);
      throw error;
    }
  }
  
  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @returns {Promise<void>}
   */
  static async markAsRead(notificationId) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error marking notification as read:', error.message);
      throw error;
    }
  }
  
  /**
   * Create a new notification
   * @param {Object} notification - Notification data
   * @returns {Promise<Object>} Created notification
   */
  static async createNotification(notification) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([{
          user_id: notification.userId,
          title: notification.title,
          message: notification.message,
          type: notification.type || 'info',
          link: notification.link || null,
          read: false
        }])
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error creating notification:', error.message);
      throw error;
    }
  }
  
  /**
   * Delete a notification
   * @param {string} notificationId - Notification ID
   * @returns {Promise<void>}
   */
  static async deleteNotification(notificationId) {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting notification:', error.message);
      throw error;
    }
  }
  
  /**
   * Delete all notifications for a user
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  static async clearAllNotifications(userId) {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error clearing notifications:', error.message);
      throw error;
    }
  }
  
  /**
   * Send application status update notification
   * @param {string} userId - User ID
   * @param {string} jobTitle - Job title
   * @param {string} status - Application status
   * @returns {Promise<Object>} Created notification
   */
  static async sendApplicationUpdateNotification(userId, jobTitle, status) {
    const statusMessages = {
      'pending': 'Your application is being reviewed',
      'reviewed': 'Your application has been reviewed',
      'shortlisted': 'Congratulations! You have been shortlisted',
      'interview': 'You have been selected for an interview',
      'rejected': 'Your application was not selected',
      'hired': 'Congratulations! You have been hired'
    };
    
    const message = statusMessages[status] || `Your application status has been updated to: ${status}`;
    
    return this.createNotification({
      userId,
      title: `Update on your application for ${jobTitle}`,
      message,
      type: status === 'rejected' ? 'error' : 'success',
      link: '/applications'
    });
  }
  
  /**
   * Send new match notification
   * @param {string} userId - User ID
   * @param {string} jobTitle - Job title
   * @param {number} score - Match score
   * @returns {Promise<Object>} Created notification
   */
  static async sendNewMatchNotification(userId, jobTitle, score) {
    return this.createNotification({
      userId,
      title: 'New Job Match',
      message: `You have a new job match: ${jobTitle} (${score}% match)`,
      type: 'info',
      link: '/dashboard'
    });
  }
}

export default NotificationService;