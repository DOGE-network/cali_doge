# Rate Limit User Experience Guide

This document shows exactly what users will see when they hit rate limits on your California DOGE application.

## 🚨 Rate Limited User Experience

### Scenario 1: User hits rate limit on Search page

**What the user sees:**

```
┌─────────────────────────────────────────────────────────────┐
│                    🔍 Search California Government Data     │
│              Find departments, vendors, programs, and funds │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ⚠️  Too Many Requests                              │   │
│  │    You've exceeded the rate limit for this page    │   │
│  │                                                     │   │
│  │ 🕐 Please wait 2 minutes before trying again       │   │
│  │                                                     │   │
│  │ Rate limit resets at: 2:45 PM                      │   │
│  │ Requests remaining: 0                               │   │
│  │                                                     │   │
│  │ 💡 Why this happened: This helps protect our       │   │
│  │    servers from abuse and ensures fair access      │   │
│  │    for all users.                                   │   │
│  │                                                     │   │
│  │ [🔄 Try Again] (appears when timer expires)        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Scenario 2: User hits rate limit on API calls (e.g., spending data)

**What the user sees in browser console:**
```
Error: {"message":"Too many requests. Please try again later.","status":429,"rateLimit":{"retryAfter":60,"remaining":0,"resetTime":1712345678901}}
```

**What the user sees in the UI:**
```
┌─────────────────────────────────────────────────────────────┐
│                    💰 California Government Spending        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ⚠️  Too Many Requests                              │   │
│  │    You've exceeded the rate limit for this page    │   │
│  │                                                     │   │
│  │ 🕐 Please wait 1 minute before trying again        │   │
│  │                                                     │   │
│  │ Rate limit resets at: 2:44 PM                      │   │
│  │ Requests remaining: 0                               │   │
│  │                                                     │   │
│  │ 💡 Why this happened: This helps protect our       │   │
│  │    servers from abuse and ensures fair access      │   │
│  │    for all users.                                   │   │
│  │                                                     │   │
│  │ [🔄 Try Again] (appears when timer expires)        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Scenario 3: User's IP is blocked due to repeated abuse

**What the user sees:**
```
┌─────────────────────────────────────────────────────────────┐
│                    ⚠️  Access Temporarily Blocked           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ⚠️  Too Many Requests                              │   │
│  │    You've exceeded the rate limit for this page    │   │
│  │                                                     │   │
│  │ 🕐 Please wait 1 hour before trying again          │   │
│  │                                                     │   │
│  │ 💡 Why this happened: This helps protect our       │   │
│  │    servers from abuse and ensures fair access      │   │
│  │    for all users.                                   │   │
│  │                                                     │   │
│  │ [🔄 Try Again] (appears when timer expires)        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Rate Limit Thresholds by Endpoint

| Endpoint Type | Requests per Minute | Block Duration | User Experience |
|---------------|-------------------|----------------|-----------------|
| **Search** (`/api/search`) | 30 | 10 minutes | Most restrictive - users see error after 30 searches |
| **Email** (`/api/send-email`) | 5 | 30 minutes | Very restrictive - prevents spam |
| **Media** (`/api/media`) | 50 | 5 minutes | Moderate - for image/media requests |
| **General API** (`/api/*`) | 100 | 5 minutes | Standard limit for most endpoints |
| **Static Assets** (`/_next/`, `/images/`) | 200 | 2 minutes | Generous - for static files |

## 🔄 Automatic Retry Behavior

### For API Calls:
- **429 errors**: User sees rate limit error component
- **403 errors**: User sees IP block error component
- **Retry button**: Appears when timer expires
- **Auto-refresh**: Some components automatically retry after delay

### For Direct Navigation:
- **429/403 responses**: User sees plain text error page
- **Manual refresh**: Required to retry after waiting period

## 🎨 Visual Design

The rate limit error component features:
- **Warning icon** (⚠️) in red
- **Clear messaging** about what happened
- **Countdown timer** showing wait time
- **Reset time** showing when limit resets
- **Explanation** of why rate limiting exists
- **Retry button** that appears when timer expires
- **Consistent styling** with your app's design system

## 📱 Mobile Experience

On mobile devices, the error component:
- **Responsive design** that fits small screens
- **Touch-friendly** retry button
- **Readable text** at mobile font sizes
- **Proper spacing** for touch interaction

## 🔧 Technical Implementation

### Error Handling Flow:
1. **User makes request** → API call to `/api/search`
2. **Rate limit exceeded** → Middleware returns 429 with headers
3. **Frontend catches error** → `isRateLimitError()` detects 429
4. **Error component renders** → `RateLimitError` displays user-friendly message
5. **Timer counts down** → User sees remaining wait time
6. **Retry available** → Button appears when timer expires

### Headers Sent by Server:
```
HTTP/1.1 429 Too Many Requests
Content-Type: text/plain
Retry-After: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1712345678901

Too many requests from your IP. Please try again later.
```

### Error Object Structure:
```typescript
{
  message: "Too many requests. Please try again later.",
  status: 429,
  rateLimit: {
    retryAfter: 60,
    remaining: 0,
    resetTime: 1712345678901
  }
}
```

## 🎯 User-Friendly Features

1. **Clear messaging**: Users understand what happened and why
2. **Wait time display**: Shows exactly how long to wait
3. **Reset time**: Shows when the limit will reset
4. **Educational content**: Explains why rate limiting exists
5. **Retry mechanism**: Easy way to try again when allowed
6. **Consistent experience**: Same error handling across all pages
7. **Graceful degradation**: App continues to work for other users

## 🚀 Best Practices for Users

When users hit rate limits, they should:
1. **Wait for the timer** to count down
2. **Don't refresh repeatedly** - this makes it worse
3. **Use the retry button** when it appears
4. **Consider their usage** - are they making too many requests?
5. **Contact support** if they believe it's an error

This rate limiting system ensures fair access for all users while protecting your servers from abuse. 