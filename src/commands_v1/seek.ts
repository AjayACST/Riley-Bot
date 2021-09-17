"use strict";
const { SlashCommandBuilder } = require("@discordjs/builders");
const timestring = require("timestring");
const humanizeDuration = require("humanize-duration");

module.exports = {
  name: "seek",
  description: "Goes to a specific point in the song. e.g 1 minute 30 seconds.",
  args: true,
  usage: "<time e.g 1m 30s>",
  guildOnly: true,
  voice: true,
  data: new SlashCommandBuilder()
    .setName("seek")
    .setDescription(
      "Goes to a specific point in the song. e.g 1 minute 30 seconds."
    )
    .addStringOption((option) =>
      option.setName("time").setDescription("e.g 1m 30s").setRequired(true)
    ),
  execute(interaction) {
    const manager = interaction.client.manager;
    const player = manager.get(interaction.guildId);
    if (!player) {
      return interaction.editReply("There is currently no song playing!");
    }

    const time = interaction.options.get("time").value;
    try {
      const seekTime = timestring(time);
      const seekTimeMS = seekTime * 1000;

      const duration = player.queue.current.duration;
      if (seekTimeMS > duration) {
        return interaction.editReply(
          `The current song is only ${humanizeDuration(duration)}.`
        );
      }
      player.seek(seekTimeMS);

      return interaction.editReply(
        `Ok I have skipped to ${humanizeDuration(seekTimeMS)}`
      );
    } catch {
      return interaction.editReply(
        "Please format the time to skip to like this, 1m 30s."
      );
    }
  },
};
