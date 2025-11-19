# Multi-Channel Notifications System

GleeWorld now supports **three notification channels**: Push Notifications, Email, and **SMS (via Twilio)**.

## Features

### Notification Channels
1. **Push Notifications** - Browser-based real-time notifications
2. **Email Notifications** - Traditional email alerts
3. **SMS Notifications** ⭐ NEW - Text message alerts via Twilio

## Setup

### Twilio Configuration
The following secrets are already configured in Supabase:
- `TWILIO_ACCOUNT_SID` - Your Twilio account SID
- `TWILIO_AUTH_TOKEN` - Your Twilio auth token
- `TWILIO_PHONE_NUMBER` - Your Twilio phone number

### User Setup
Users can enable SMS notifications by:
1. Go to **Settings → Notifications**
2. Click **"Setup SMS"** button
3. Add phone number in profile (must include country code, e.g., +1 for US)
4. SMS notifications will be sent based on their preferences

## Usage

### For Developers

#### Send Multi-Channel Notifications
```typescript
import { useMultiChannelNotifications } from '@/hooks/useMultiChannelNotifications';

const { sendNotification, sending } = useMultiChannelNotifications();

await sendNotification({
  title: 'Important Update',
  message: 'Your event starts in 30 minutes!',
  userIds: ['user-id-1', 'user-id-2'], // or use userId for single user
});
```

#### Send SMS Only
```typescript
const { data, error } = await supabase.functions.invoke('send-sms', {
  body: {
    to: '+15551234567',
    message: 'Your verification code is: 123456'
  }
});
```

## Database Tables

### `gw_notification_preferences`
Stores user notification preferences:
- `push_enabled` - Enable push notifications
- `email_enabled` - Enable email notifications  
- `sms_enabled` - Enable SMS notifications
- `phone_number` - User's phone number (E.164 format)

### `gw_notification_delivery_log`
Tracks notification delivery status across all channels.

## Edge Functions

### `send-sms`
Sends individual SMS messages via Twilio.

**Endpoint**: `/send-sms`

**Payload**:
```json
{
  "to": "+15551234567",
  "message": "Your notification text",
  "notificationId": "optional-tracking-id"
}
```

### `send-sms-notification`
Sends bulk SMS to groups or multiple users with phone lookup.

**Endpoint**: `/send-sms-notification`

**Payload**:
```json
{
  "groupId": "group-uuid",
  "message": "Bulk notification text",
  "senderName": "Dr. Johnson",
  "phoneNumbers": ["+15551234567", "user-uuid"]
}
```

## Best Practices

1. **Always use E.164 format** for phone numbers: `+[country code][number]`
2. **Respect user preferences** - Check `gw_notification_preferences` before sending
3. **Use multi-channel for important alerts** - Critical notifications should use all enabled channels
4. **Track delivery** - Use `notificationId` to track delivery status
5. **Keep messages concise** - SMS has 160 character limit

## Testing

You can test SMS notifications in the Supabase dashboard:
- View logs: https://supabase.com/dashboard/project/oopmlreysjzuxzylyheb/functions/send-sms/logs
- Check secrets: https://supabase.com/dashboard/project/oopmlreysjzuxzylyheb/settings/functions

## Troubleshooting

### SMS Not Sending
1. Check Twilio credentials in Supabase secrets
2. Verify phone number is in E.164 format
3. Check Twilio account balance
4. Review function logs for errors

### User Not Receiving SMS
1. Verify user has `sms_enabled = true` in preferences
2. Confirm phone number is valid and stored
3. Check delivery log for failed attempts

