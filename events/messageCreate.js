
const { Events } = require('discord.js');
const { sendDevLog } = require('../utils/devLog');
const { GuildSettings } = require('../utils/database');

const { createCard } = require('../utils/canvas');

module.exports = {
  name: Events.MessageCreate,
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    const prefix = GuildSettings.ensure(message.guild.id).prefix || client.config.prefix;
    const prefixRegex = new RegExp(`^(<@!?${client.user.id}>|\\${prefix})\\s*`);
    if (!prefixRegex.test(message.content)) return;

    const [, matchedPrefix] = message.content.match(prefixRegex);
    const args = message.content.slice(matchedPrefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    if (!commandName) {
        if (matchedPrefix.includes(client.user.id)) {
            const currentPrefix = GuildSettings.ensure(message.guild.id).prefix || client.config.prefix;
            const image = await createCard('Vouch Bot', `My prefix is \`${currentPrefix}\``, client.user, { color: '#F1C40F' });
            return message.reply({ files: [image], allowedMentions: { repliedUser: false } });
        }
        return;
    }

    const command = client.commands.get(commandName) || client.commands.get(client.aliases.get(commandName));
    if (!command || !command.prefixExecute) return;

    try {
      await command.prefixExecute(message, args, client);
    } catch (error) {
      console.error(error);
      sendDevLog(client, { type: 'error', title: 'Prefix Command Error', body: `**Command:** ${commandName}\n**User:** ${message.author.tag} (${message.author.id})\n**Error:**\n\`\`\`${error.stack}\`\`\`` });
      message.reply({ content: 'There was an error trying to execute that command.', allowedMentions: { repliedUser: false } });
    }
  },
};
