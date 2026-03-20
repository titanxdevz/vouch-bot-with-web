const { Events, Collection, MessageFlags } = require('discord.js');
const { sendDevLog } = require('../utils/devLog');
const { errorReply } = require('../utils/builders');
const { isDev } = require('../utils/permissions');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    if (command.devOnly && !isDev(client, interaction.user.id)) {
      return interaction.reply(errorReply('Developer Only', 'This command can only be used by bot developers.'));
    }

    if (command.guildOnly && !interaction.guild) {
      return interaction.reply(errorReply('Server Only', 'This command can only be used inside a server.'));
    }

    const { cooldowns } = client;
    if (!cooldowns.has(command.data.name)) {
      cooldowns.set(command.data.name, new Collection());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(command.data.name);
    const cooldownAmount = (command.cooldown || 3) * 1000;

    if (timestamps.has(interaction.user.id)) {
      const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
      if (now < expirationTime) {
        const timeLeft = (expirationTime - now) / 1000;
        return interaction.reply(errorReply('Cooldown', `Please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.data.name}\` command.`));
      }
    }

    timestamps.set(interaction.user.id, now);
    setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error(error);
      sendDevLog(client, {
        type: 'error',
        title: 'Command Error',
        body: `**Command:** ${interaction.commandName}\n**User:** ${interaction.user.tag} (${interaction.user.id})\n**Error:**\n\`\`\`${error.stack}\`\`\``
      });
      const reply = errorReply('Command Error', 'There was an error while executing this command. The developers have been notified.');
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    }
  },
};
