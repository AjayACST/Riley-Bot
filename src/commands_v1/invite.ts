import { inviteLink } from "../../config.json";
import Discord from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";

module.exports = {
  name: "invite",
  description: "Sends an invite link for the bot.",
  args: false,
  guildOnly: false,
  voice: false,
  data: new SlashCommandBuilder()
    .setName("invite")
    .setDescription("Sends an invite link for the bot."),
  execute(interaction) {
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
    return interaction.editReply({ embeds: [embed] });
  },
};
