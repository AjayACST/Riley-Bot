"use strict";
const Discord = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
  name: "pause",
  description: "Pause or resume the current song.",
  args: false,
  guildOnly: true,
  voice: true,
  data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pause or resume the current song."),
  execute(interaction) {
    const manager = interaction.client.manager;
    const player = manager.get(interaction.guildId);

    if (!player) {
      return interaction.editReply("There is currently no songs playing!");
    }

    if (player.paused) {
      player.pause(false);
      const messageEmbed = new Discord.MessageEmbed()
        .setColor("#ed1c24")
        .setTitle("⏸️ I have resumed the media!")
        .setAuthor(
          interaction.client.user.username,
          interaction.client.user.avatarURL()
        );
      return interaction.editReply({ embeds: [messageEmbed] });
    }
    player.pause(true);
    const messageEmbed = new Discord.MessageEmbed()
      .setColor("#ed1c24")
      .setTitle("⏸️ I have paused the media!")
      .setAuthor(
        interaction.client.user.username,
        interaction.client.user.avatarURL()
      );
    return interaction.editReply({ embeds: [messageEmbed] });
  },
};
