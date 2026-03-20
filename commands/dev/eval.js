const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { infoReply, errorReply } = require('../../utils/builders');
const { isDev } = require('../../utils/permissions');
const { inspect } = require('util');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('eval')
    .setDescription('Execute arbitrary JavaScript code.')
    .addStringOption(option => option.setName('code').setDescription('The code to execute').setRequired(true)),
  aliases: ['eval'],
  devOnly: true,
  guildOnly: false,
  async execute(interaction, client) {
    if (!isDev(client, interaction.user.id) || !client.config.devIds.includes(interaction.user.id) || interaction.user.id !== client.config.devIds[0]) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    await interaction.deferReply();

    const code = interaction.options.getString('code');
    try {
      let evaled = await eval(code);
      if (typeof evaled !== 'string') {
        evaled = inspect(evaled, { depth: 0 });
      }
      await interaction.editReply(infoReply('Eval Result', `\`\`\`js\n${evaled.substring(0, 1800)}\n\`\`\``));
    } catch (error) {
      await interaction.editReply(errorReply('Eval Error', `\`\`\`xl\n${error.stack.substring(0, 1800)}\n\`\`\``));
    }
  },
  async prefixExecute(message, args, client) {
    if (!isDev(client, message.author.id) || !client.config.devIds.includes(message.author.id) || message.author.id !== client.config.devIds[0]) {
      return message.reply({ content: 'You do not have permission to use this command.' });
    }

    const code = args.join(' ');
    try {
      let evaled = await eval(code);
      if (typeof evaled !== 'string') {
        evaled = inspect(evaled, { depth: 0 });
      }
      await message.reply(infoReply('Eval Result', `\`\`\`js\n${evaled.substring(0, 1800)}\n\`\`\``));
    } catch (error) {
      await message.reply(errorReply('Eval Error', `\`\`\`xl\n${error.stack.substring(0, 1800)}\n\`\`\``));
    }
  },
};
