const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const config = require('../config');

const COOLDOWN_MS = 5000;
const cooldowns = new Map();

module.exports = {
  category: 'AI',
  data: new SlashCommandBuilder()
    .setName('ai')
    .setDescription('Vorbește cu NeroAI')
    .addStringOption((option) =>
      option
        .setName('prompt')
        .setDescription('Ce vrei să întrebi')
        .setRequired(true)
        .setMaxLength(2000),
    )
    .addBooleanOption((option) =>
      option.setName('privat').setDescription('Doar tu vezi răspunsul'),
    ),

  async execute(interaction) {
    if (!config.openai.apiKey) {
      return interaction.reply({
        content:
          'Comanda `/ai` nu este configurată. Adaugă `OPENAI_API_KEY` în fișierul `.env` și repornește botul.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const wait = COOLDOWN_MS - (Date.now() - (cooldowns.get(interaction.user.id) ?? 0));
    if (wait > 0) {
      return interaction.reply({
        content: `Așteaptă ${Math.ceil(wait / 1000)}s înainte de următoarea întrebare.`,
        flags: MessageFlags.Ephemeral,
      });
    }
    cooldowns.set(interaction.user.id, Date.now());

    const prompt = interaction.options.getString('prompt', true);
    const isPrivate = interaction.options.getBoolean('privat') ?? false;
    const ephemeral = isPrivate ? { flags: MessageFlags.Ephemeral } : {};

    await interaction.deferReply(ephemeral);

    let answer;
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.openai.apiKey}`,
        },
        body: JSON.stringify({
          model: config.openai.model,
          messages: [
            {
              role: 'system',
              content:
                config.general.language === 'en'
                  ? `${config.openai.systemPrompt}\n\nAlways answer in English.`
                  : config.openai.systemPrompt,
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
        }),
        signal: AbortSignal.timeout(45_000),
      });

      if (!response.ok) {
        console.error('OpenAI error:', response.status, await response.text());

        const message =
          response.status === 401
            ? 'Cheia OpenAI este invalidă. Verifică `OPENAI_API_KEY`.'
            : response.status === 429
              ? 'Limita OpenAI a fost atinsă (prea multe cereri sau credit epuizat). Încearcă mai târziu.'
              : `OpenAI a răspuns cu eroarea ${response.status}. Încearcă din nou.`;

        return interaction.editReply(message);
      }

      const data = await response.json();
      answer = data.choices?.[0]?.message?.content?.trim();
    } catch (error) {
      console.error('Eroare la apelul OpenAI:', error);
      return interaction.editReply('Nu am putut contacta OpenAI. Verifică conexiunea și încearcă din nou.');
    }

    if (!answer) {
      return interaction.editReply('Modelul nu a returnat niciun răspuns. Încearcă să reformulezi.');
    }

    const chunks = splitMessage(answer);
    await interaction.editReply({ content: chunks[0], allowedMentions: { parse: [] } });

    for (const chunk of chunks.slice(1)) {
      await interaction.followUp({ content: chunk, allowedMentions: { parse: [] }, ...ephemeral });
    }
  },
};

function splitMessage(text, limit = 1900) {
  const chunks = [];
  let rest = text;

  while (rest.length > limit) {
    let index = rest.lastIndexOf('\n', limit);
    if (index < limit * 0.5) index = rest.lastIndexOf(' ', limit);
    if (index < limit * 0.5) index = limit;

    chunks.push(rest.slice(0, index));
    rest = rest.slice(index).trimStart();
  }

  if (rest.length) chunks.push(rest);

  return chunks;
}
