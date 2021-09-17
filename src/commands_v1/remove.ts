"use strict";
const { clientRedis } = require("../utils/redis");
const Discord = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
  name: "remove",
  description: "Removes a specifc song from the queue",
  args: false,
  guildOnly: true,
  voice: true,
  data: new SlashCommandBuilder()
    .setName("remove")
    .setDescription("Removes a specifc song from the queue")
    .addIntegerOption((option) =>
      option
        .setName("songnumber")
        .setDescription("Song number in queue to remove.")
        .setRequired(true)
    ),
  async execute(interaction) {
    const manager = interaction.client.manager;
    const player = manager.get(interaction.guildId);

    if (!player) {
      return interaction.editReply("There is currently no songs in the queue!");
    }

    const redisReply = await clientRedis.get(`guild_${interaction.guildId}`);
    const serverQueue = JSON.parse(redisReply);

    const remove = interaction.options.get("songnumber").value;

    if (remove === 1) {
      return interaction.editReply("I cannot remove the current song playing.");
    }

    if (remove > serverQueue.songs.length || remove < 0) {
      return interaction.editReply(
        `The queue is only ${serverQueue.songs.length} songs long!`
      );
    }
    const deletedSong = serverQueue.songs[remove - 1].title;

    serverQueue.songs.splice(remove - 1, 1);

    await clientRedis.set(
      `guild_${interaction.guildId}`,
      JSON.stringify(serverQueue),
      "EX",
      86400 //skipcq: JS-0074
    );

    const replyEmbed = new Discord.MessageEmbed()
      .setColor("#ed1c24")
      .setTitle(`${deletedSong} Has Been Removed From The Queue!`)
      .setAuthor(
        interaction.client.user.username,
        interaction.client.user.avatarURL()
      );

    return interaction.editReply({ embeds: [replyEmbed] });
  },
};
