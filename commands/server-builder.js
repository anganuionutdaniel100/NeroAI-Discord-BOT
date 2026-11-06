const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const {
  ServerBuilderError,
  generateForGuild,
  applyPlanForGuild,
  builderPlanEmbed,
  applyResultEmbed,
  historyEmbed,
} = require('../handlers/serverBuilder');
const { PROMPT_MIN, PROMPT_MAX } = require('../utils/serverBuilder');

async function adminGenerate(interaction) {
  const prompt = interaction.options.getString('cerinta', true);

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const result = await generateForGuild(interaction.guild, prompt, interaction.user.tag);
    if (result.error) {
      return interaction.editReply({ content: result.error });
    }

    return interaction.editReply({
      embeds: [builderPlanEmbed(result.plan, result.preview)],
    });
  } catch (error) {
    return interaction.editReply({
      content:
        error instanceof ServerBuilderError
          ? error.message
          : 'Planul nu a putut fi generat. Încearcă din nou.',
    });
  }
}

async function adminApply(interaction) {
  const planId = interaction.options.getString('id', true);

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const result = await applyPlanForGuild(interaction.guild, planId, interaction.user.tag);
    if (result.error) {
      return interaction.editReply({ content: result.error });
    }

    return interaction.editReply({
      embeds: [applyResultEmbed(result.plan, result.result)],
    });
  } catch (error) {
    return interaction.editReply({
      content: 'Planul nu a putut fi aplicat. Verifică permisiunile botului și încearcă din nou.',
    });
  }
}

async function adminHistory(interaction) {
  return interaction.reply({
    embeds: [historyEmbed(interaction.guild)],
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  category: 'Utilitare',
  data: new SlashCommandBuilder()
    .setName('server-builder')
    .setDescription('Generează și aplică structuri de server cu AI')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('genereaza')
        .setDescription('Generează un plan de structură pe baza unei cerințe')
        .addStringOption((option) =>
          option
            .setName('cerinta')
            .setDescription('Ce fel de structură vrei să creezi')
            .setMinLength(PROMPT_MIN)
            .setMaxLength(PROMPT_MAX)
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('aplica')
        .setDescription('Aplică un plan generat, creat doar elementele lipsă')
        .addStringOption((option) =>
          option
            .setName('id')
            .setDescription('ID-ul planului afișat la generare')
            .setMinLength(6)
            .setMaxLength(40)
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('istoric')
        .setDescription('Afișează planurile generate recent'),
    ),

  async execute(interaction) {
    switch (interaction.options.getSubcommand()) {
      case 'genereaza':
        return adminGenerate(interaction);
      case 'aplica':
        return adminApply(interaction);
      case 'istoric':
        return adminHistory(interaction);
      default:
        return interaction.reply({
          content: 'Subcomanda nu este disponibilă.',
          flags: MessageFlags.Ephemeral,
        });
    }
  },
};
