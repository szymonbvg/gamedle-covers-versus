# Gamedle Covers Versus Backend

- [Website Repository](https://github.com/szymonbvg/covers-versus-website)
- [IGDB API Docs (Getting Started)](https://api-docs.igdb.com/#getting-started)

This project is a spin-off of Gamedle where you guess the game only by it's cover, have limited time to answer and can compete with your friends.
The game mainly relies on the Gamedle & IGDB API.

**NOTE:** IGDB API requires TwitchOAuth, so when running project locally you have to register Twitch App from your developer panel and set up `.env` file like below:

```
TWITCH_CLIENT_ID=Client ID
TWITCH_CLIENT_SECRET=Client Secret
```
