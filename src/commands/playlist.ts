import { clientRedis } from "../utils/redis";
import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, GuildMember, Message, MessageEmbed, MessageEmbedOptions } from "discord.js";
import { Command } from "../types/Command";

export default class Playlist extends Command {
    name = "playlist"
    description =
        "Plays all songs from a youtube playlist, spotify album or spotify playlist."
    args = true
    usage = "<youtube URL, spotify album or playlist URL>"
    guildOnly = true
    voice = true

    data = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption((option) =>
            option
                .setName("playlisturl")
                .setDescription("Youtube URL, spotify album or playlist URL.")
                .setRequired(true)
        ),

    execute = async (interaction: CommandInteraction) => {
        const manager = interaction.client.manager;
        interaction.member = interaction.member as GuildMember
        const voiceChannel = interaction.member.voice.channel;

        const issue = this.hasPermissionsJoin(voiceChannel);
        if (issue !== null) {
            interaction.reply(issue);
        }

        const mediaName = interaction.options.get("playlisturl").value as string;

        if (!mediaName.startsWith("https://")) {
            interaction.editReply(
                "You did not supply a link to a youtube playlist!"
            );
            return;
        }

        const searchEmbed = new Discord.MessageEmbed()
            .setColor("#ed1c24")
            .setTitle("🔍 Searching For Video")
            .setAuthor(
                interaction.client.user.username,
                interaction.client.user.avatarURL()
            )
            .setDescription("Please wait we are searching for that playlist.");
        interaction.editReply({ embeds: [searchEmbed] });

        const response = await manager.search(mediaName);
        if (!response) {
            return interaction.editReply(
                "Sorry, an error has occurred, please try again later!"
            );
        }
        if (!response.tracks[0]) {
            interaction.editReply("Sorry, there were no songs found!");
            return;
        }
        if (response.tracks[0].isStream) {
            interaction.editReply("Sorry, that video is a livestream!");
            return;
        }

        const songQueue = {
            title: response.tracks[0].title,
            url: response.tracks[0].uri,
            thumbnail: response.tracks[0].thumbnail,
            author: response.tracks[0].author, //used for spotify
            duration: response.tracks[0].duration, //used for spotify
        };

        // by defualt set the for loop for playlist to zero so we start at the start of the playlist
        let forNumb = 0;

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
            //play the first song
            player.play(response.tracks[0]);

            //There were no songs already in the queue so we have already added the first song skip that song in the for loop
            forNumb = 1;
        }

        let errorSongs = 0;

        for (let i = forNumb; i < response.tracks.length; i++) {
            if (response.tracks[0].isStream) {
                errorSongs++;
            }
            const songsAdd = {
                title: response.tracks[i].title,
                url: response.tracks[i].uri,
                thumbnail: response.tracks[i].thumbnail,
                author: response.tracks[i].author, //used for spotify
                duration: response.tracks[i].duration, //used for spotify
            };
            serverQueue.songs.push(songsAdd);
        }
        await clientRedis.set(
            `guild_${interaction.guildId}`,
            JSON.stringify(serverQueue)
        );

        const playlistEmbed = new Discord.MessageEmbed()
            .setColor("#ed1c24")
            .setTitle("I have added all the songs from that playlist into the queue.")
            .setAuthor(
                interaction.client.user.username,
                interaction.client.user.avatarURL()
            );
        if (errorSongs > 0) {
            playlistEmbed.setDescription(
                `I have added ${response.tracks.length - errorSongs
                } to the queue and had an erorr adding ${errorSongs}!`
            );
        } else {
            playlistEmbed.setDescription(
                `I have added ${response.tracks.length} to the queue!`
            );
        }

        interaction.editReply({ embeds: [playlistEmbed] });
        return;
    }
}