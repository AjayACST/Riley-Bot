"use strict";
const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
  name: "skip",
  description: "Skips the current playing song.",
  args: false,
  guildOnly: true,
  voice: true,
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Skips the current playing song."),
  execute(interaction) {
    const manager = interaction.client.manager;
    const player = manager.get(interaction.guildId);

    if (!player) {
      return interaction.editReply("There is currently no song playing!");
    }

    interaction.editReply("I have skipped to the next song!");

    return player.stop();
  },
};
