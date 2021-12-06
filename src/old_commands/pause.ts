import { SlashCommandBuilder } from '@discordjs/builders';
import { MessageEmbed } from 'discord.js';

import { Command, CommandInteraction } from "../types/Command.js";

export default class Pause extends Command {
  name = 'pause';

  description = 'Pause or resume the current song.';

  args = false;

  usage = null;

  guildOnly = true;

  voice = true;

  data = new SlashCommandBuilder()
    .setName(this.name)
    .setDescription(this.description);

  execute = async (interaction: CommandInteraction): Promise<void> => {
    const { manager } = interaction.client;
    const player = manager.get(interaction.guildId);

    if (!player) {
      interaction.editReply('There is currently no songs playing!');
      return;
    }
    let messageEmbed: MessageEmbed;

    if (player.paused) {
      player.pause(false);
      messageEmbed = new MessageEmbed()
        .setColor('#ed1c24')
        .setTitle('⏸️ I have resumed the media!')
        .setAuthor(
          interaction.client.user.username,
          interaction.client.user.avatarURL()
        );
    } else {
      player.pause(true);
      messageEmbed = new MessageEmbed()
        .setColor('#ed1c24')
        .setTitle('⏸️ I have paused the media!')
        .setAuthor(
          interaction.client.user.username,
          interaction.client.user.avatarURL()
        );
    }
    interaction.editReply({ embeds: [messageEmbed] });
  };
}
