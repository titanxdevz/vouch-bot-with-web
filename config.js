require('dotenv').config();

module.exports = {
  token: process.env.TOKEN,
  clientId: process.env.CLIENT_ID,
  mainServerId: process.env.MAIN_SERVER_ID,
  devLogChannelId: process.env.DEV_LOG_CHANNEL_ID,
  devIds: process.env.DEV_IDS ? process.env.DEV_IDS.split(',') : [],
  prefix: '-',
  version: '1.0.0',
  port: process.env.PORT || 3000,
  dashboardUrl: process.env.CALLBACK_URL ? process.env.CALLBACK_URL.replace('/callback', '') : 'http://localhost:3000',
  inviteUrl: `https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=8&scope=bot%20applications.commands`,
  supportServer: ''
};
