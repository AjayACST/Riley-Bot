import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import { Command } from "../types/Command";
import { inviteLink } from "../../config.json";

export default class Help extends Command {
  name: "invite";
  description: "Sends an invite link for the bot.";
  usage: "invite";
  args = false;
  guildOnly = false;
  voice = false;

  data = new SlashCommandBuilder()
    .setName(this.name)
    .setDescription(this.description);

  execute = async (interaction: CommandInteraction) => {
    const embed = new Discord.MessageEmbed()
      .setColor("#ed1c24")
      .setAuthor(
        interaction.client.user.username,
        interaction.client.user.avatarURL()
      )
      .setTitle(
        `Click Here to Invite ${interaction.client.user.username} To Your Server!`
      )
      .setURL(inviteLink);
    interaction.editReply({ embeds: [embed] });
  };
}
