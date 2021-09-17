"use strict";
import Discord = require("discord.js");
import { clientRedis } from "../utils/redis";
import { SlashCommandBuilder } from "@discordjs/builders";

module.exports = {
  name: "nowplaying",
  description: "Shows the media that is currently playing.",
  args: false,
  guildOnly: true,
  voice: true,
  data: new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("Shows the media that is currently playing."),
  async execute(interaction) {
    const manager = interaction.client.manager;
    const player = manager.get(interaction.guildId);

    const redisReply = await clientRedis.get(`guild_${interaction.guildId}`);

    if (!player && !redisReply) {
      return interaction.editReply("There is currently no songs playing!");
    }
    const serverQueue = JSON.parse(redisReply);

    const npEmbed = new Discord.MessageEmbed()
      .setColor("#ed1c24")
      .setAuthor(
        interaction.client.user.username,
        interaction.client.user.avatarURL()
      )
      .setTitle(`${serverQueue.songs[0].title} Is Now Playing!`)
      .setURL(serverQueue.songs[0].url)
      .setThumbnail(serverQueue.songs[0].thumbnail);

    const Buttons = new Discord.MessageActionRow().addComponents(
      new Discord.MessageButton()
        .setCustomId("stop")
        .setLabel("⏹️")
        .setStyle("SECONDARY"),

      new Discord.MessageButton()
        .setCustomId("pause")
        .setLabel("⏯️")
        .setStyle("SECONDARY"),

      new Discord.MessageButton()
        .setCustomId("skip")
        .setLabel("⏭️")
        .setStyle("SECONDARY")
    );

    interaction.editReply({
      embeds: [npEmbed],
      components: [Buttons],
    });
    const message = await interaction.fetchReply();
    const collector = message.createMessageComponentCollector({
      time: serverQueue.songs[0].duration,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "stop") {
        if (!player) {
          return collector.stop();
        }
        serverQueue.songs = [];
        await clientRedis.set(
          `guild_${i.guildId}`,
          JSON.stringify(serverQueue)
        );
        await player.stop();
        i.reply("Stoping the music!");
        return collector.stop();
      } else if (i.customId === "pause") {
        if (!player) {
          return collector.stop();
        }
        player.pause(!player.paused);
        const pauseText = player.paused ? "paused" : "unpaused";
        i.reply(`I have ${pauseText} the music!`);
      } else if (i.customId === "skip") {
        if (!player) {
          return collector.stop();
        }
        await player.stop();
        i.reply("I have skipped to the next song!");
        if (serverQueue.songs.length === 1) {
          return collector.stop();
        }
        return;
      }
    });
  },
};
