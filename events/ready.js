
const { Events, ActivityType } = require('discord.js');
const { GuildSettings } = require('../utils/database');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`Ready! Logged in as ${client.user.tag}`);
    console.log(`Bot is in ${client.guilds.cache.size} servers.`);

    client.guilds.cache.forEach(guild => {
      GuildSettings.ensure(guild.id);
    });

    const activities = [
      { name: '/vouch', type: ActivityType.Watching },
      { name: `${client.guilds.cache.size} servers`, type: ActivityType.Watching },
      { name: '/help', type: ActivityType.Listening }
    ];

    let activityIndex = 0;
    setInterval(() => {
      const activity = activities[activityIndex];
      client.user.setPresence({ activities: [activity], status: 'online' });
      activityIndex = (activityIndex + 1) % activities.length;
    }, 20000);
  },
};
