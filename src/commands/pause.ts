import { clientRedis } from "../utils/redis";
import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, Message, MessageEmbed, MessageEmbedOptions } from "discord.js";
import { Command } from "../types/Command";

export default class Pause extends Command {
    name = "pause";
    description = "Pause or resume the current song.";
    args = false;
    usage = null;
    guildOnly = true;
    voice = true;

    data = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description);

    execute = async (interaction: CommandInteraction) => {
        const manager = interaction.client.manager;
        const player = manager.get(interaction.guildId);

        if (!player) {
            return interaction.editReply("There is currently no songs playing!");
        }
        let messageEmbed: MessageEmbed;

        if (player.paused) {
            player.pause(false);
            messageEmbed = new Discord.MessageEmbed()
                .setColor("#ed1c24")
                .setTitle("⏸️ I have resumed the media!")
                .setAuthor(
                    interaction.client.user.username,
                    interaction.client.user.avatarURL()
                );
        } else {
            player.pause(true);
            messageEmbed = new Discord.MessageEmbed()
                .setColor("#ed1c24")
                .setTitle("⏸️ I have paused the media!")
                .setAuthor(
                    interaction.client.user.username,
                    interaction.client.user.avatarURL()
                );
        }
        interaction.editReply({ embeds: [messageEmbed] });
        return;
    }
}