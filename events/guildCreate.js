
const { Events } = require('discord.js');
const { GuildSettings } = require('../utils/database');
const { sendDevLog } = require('../utils/devLog');

module.exports = {
  name: Events.GuildCreate,
  async execute(guild, client) {
    GuildSettings.ensure(guild.id);
    const owner = await guild.fetchOwner();
    sendDevLog(client, {
      type: 'join',
      title: 'Joined Server',
      body: `**Name:** ${guild.name} (${guild.id})\n**Members:** ${guild.memberCount}\n**Owner:** ${owner.user.tag} (${owner.id})\n**Total Servers:** ${client.guilds.cache.size}`
    });
  },
};
