import { clientRedis } from "../utils/redis";
import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, GuildMember } from "discord.js";
import { Command } from "../types/Command";

export default class Play extends Command {
  name = "play";
  description = "Plays a song from youtube, spotify or any MP3 url.";
  args = true;
  usage = "<youtube URL, video name or spotify URL>";
  guildOnly = true;
  voice = true;

  data = new SlashCommandBuilder()
    .setName(this.name)
    .setDescription(this.description)
    .addStringOption((option) =>
      option
        .setName("songname")
        .setDescription("Youtube URL, video name or Spotify URL.")
        .setRequired(true)
    );

  execute = async (interaction: CommandInteraction) => {
    interaction.member = interaction.member as GuildMember;
    const manager = interaction.client.manager;
    const voiceChannel = interaction.member.voice.channel;
    const mediaName = interaction.options.get("songname").value as string;

    if (!voiceChannel) {
      interaction.reply("You need to be in a voice channel to play music!");
    }

    const issue = this.hasPermissionsJoin(voiceChannel);
    if (issue !== null) {
      interaction.reply(issue);
    }

    const searchEmbed = new Discord.MessageEmbed()
      .setColor("#ed1c24")
      .setTitle("🔍 Searching For Video")
      .setAuthor(
        interaction.client.user.username,
        interaction.client.user.avatarURL()
      )
      .setDescription(
        `Please wait we are searching for a song called ${mediaName}`
      );
    await interaction.editReply({ embeds: [searchEmbed] });

    const response = await manager.search(mediaName);
    if (!response) {
      interaction.editReply(
        "Sorry, an error has occurred, please try again later!"
      );
      return;
    }
    if (!response.tracks[0]) {
      interaction.editReply("Sorry, there were no songs found!");
      return;
    }

    const songQueue = {
      title: response.tracks[0].title,
      url: response.tracks[0].uri,
      thumbnail: response.tracks[0].thumbnail,
      author: response.tracks[0].author, //used for spotify
      duration: response.tracks[0].duration, //used for spotify
    };

    const redisReply = await clientRedis.get(`guild_${interaction.guildId}`);
    let serverQueue = JSON.parse(redisReply);

    if (!serverQueue) {
      const node = await manager.leastLoadNodes;
      const player = manager.create({
        guild: interaction.guildId,
        voiceChannel: voiceChannel.id,
        textChannel: interaction.channelId,
        selfDeafen: true,
        node: node[0],
      });

      player.connect();

      serverQueue = {
        textChannel: interaction.channel,
        voiceChannel: voiceChannel,
        songs: [],
      };
      serverQueue.songs.push(songQueue);
      await clientRedis.set(
        `guild_${interaction.guildId}`,
        JSON.stringify(serverQueue)
      );
      player.play(response.tracks[0]);
    } else {
      serverQueue.songs.push(songQueue);
      clientRedis.set(
        `guild_${interaction.guildId}`,
        JSON.stringify(serverQueue)
      );

      const addQueueEmbed = new Discord.MessageEmbed()
        .setColor("#ed1c24")
        .setTitle(songQueue.title)
        .setURL(songQueue.url)
        .setAuthor(
          interaction.client.user.username,
          interaction.client.user.avatarURL()
        )
        .setDescription(
          `[${songQueue.title}](${songQueue.url}) has been added to the queue and is number ${serverQueue.songs.length} in the queue!`
        )
        .setThumbnail(songQueue.thumbnail);

      interaction.editReply({ embeds: [addQueueEmbed] });
    }
  };
}
