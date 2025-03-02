# cali_doge
I am the love child of Elon Musk and Lanhee Chen. Godson of David Sacks. A fun mode parody account for educational purposes.

## GitHub Actions Setup

GitHub secrets:

| Secret Name | Description |
|-------------|-------------|
| `TWITTER_API_KEY` | Twitter API Key from your Twitter Developer account |
| `TWITTER_API_KEY_SECRET` | Twitter API Key Secret |
| `TWITTER_BEARER_TOKEN` | Twitter Bearer Token |
| `TWITTER_ACCESS_TOKEN` | Twitter Access Token |
| `TWITTER_ACCESS_TOKEN_SECRET` | Twitter Access Token Secret |
| `TWITTER_USERNAME` | Twitter username to fetch tweets from |

These secrets will be used by the GitHub Actions workflow to authenticate with the Twitter API and fetch tweets automatically.

## Local Development

For local development, create a `.env.local` file in the root directory with the same variables:

```
TWITTER_API_KEY=your_api_key
TWITTER_API_KEY_SECRET=your_api_key_secret
TWITTER_BEARER_TOKEN=your_bearer_token
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret
TWITTER_USERNAME=your_twitter_username
```
