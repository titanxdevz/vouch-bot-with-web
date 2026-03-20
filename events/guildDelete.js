
const { Events } = require('discord.js');
const { sendDevLog } = require('../utils/devLog');

module.exports = {
  name: Events.GuildDelete,
  async execute(guild, client) {
    sendDevLog(client, {
      type: 'leave',
      title: 'Left Server',
      body: `**Name:** ${guild.name} (${guild.id})\n**Total Servers:** ${client.guilds.cache.size}`
    });
  },
};
