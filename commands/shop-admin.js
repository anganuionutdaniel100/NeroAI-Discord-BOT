const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const config = require('../config');
const { formatAmount } = require('../utils/economy');
const { getItem, getItems, createItem, updateItem, deleteItem, flush } = require('../utils/shop');
const { sendShopAdminLog } = require('../handlers/shop');

function truncate(text, length = 1000) {
  const value = text || '—';
  return value.length > length ? `${value.slice(0, length - 3)}...` : value;
}

function normalizeId(raw) {
  return (raw ?? '').trim().toLowerCase();
}

function roleProblem(guild, role) {
  if (!role) return null;
  if (role.id === guild.id) return 'Rolul @everyone nu poate fi vândut.';
  if (role.managed) return 'Rolurile gestionate de integrări nu pot fi acordate manual.';

  const me = guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return 'Botul nu are permisiunea Manage Roles.';
  }

  if (role.comparePositionTo(me.roles.highest) >= 0) {
    return 'Rolul trebuie să fie sub cel mai înalt rol al botului.';
  }

  return null;
}

function itemField(item) {
  const role = item.roleId ? `<@&${item.roleId}>` : '—';
  return {
    name: truncate(`${item.name} — ${item.id}`, 256),
    value: truncate(
      `Preț: ${formatAmount(item.price)} ${config.economy.currency}\nStoc: ${item.stock === null ? 'nelimitat' : item.stock}\nRol: ${role}\nO singură achiziție: ${item.oneTime ? 'da' : 'nu'}`,
      1024,
    ),
  };
}

async function addItem(interaction) {
  const name = interaction.options.getString('nume', true).trim();
  const price = interaction.options.getInteger('pret', true);

  if (!name) {
    return interaction.reply({
      content: 'Numele articolului nu poate fi gol.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const description = interaction.options.getString('descriere')?.trim() || null;
  const role = interaction.options.getRole('rol');
  const stock = interaction.options.getInteger('stoc');
  const oneTime = interaction.options.getBoolean('o_singura_data') ?? true;

  const problem = roleProblem(interaction.guild, role);
  if (problem) {
    return interaction.reply({ content: problem, flags: MessageFlags.Ephemeral });
  }

  const item = createItem({
    guildId: interaction.guild.id,
    name,
    description,
    price,
    roleId: role?.id ?? null,
    stock: stock ?? null,
    oneTime,
    createdBy: interaction.user.id,
  });
  flush();

  await interaction.reply({
    content: `Articolul **${item.name}** a fost adăugat cu ID-ul \`${item.id}\`.`,
    flags: MessageFlags.Ephemeral,
  });

  await sendShopAdminLog(interaction.guild, {
    title: 'Magazin — articol adăugat',
    description: `${interaction.user.tag} (${interaction.user.id})`,
    color: 0x57f287,
    fields: [
      { name: 'Articol', value: `${item.name} (${item.id})`, inline: true },
      {
        name: 'Preț',
        value: `${formatAmount(item.price)} ${config.economy.currency}`,
        inline: true,
      },
      { name: 'Stoc', value: item.stock === null ? 'nelimitat' : String(item.stock), inline: true },
    ],
  });
}

async function editItem(interaction) {
  const id = normalizeId(interaction.options.getString('id', true));
  const item = getItem(id);

  if (!item || item.guildId !== interaction.guild.id) {
    return interaction.reply({
      content: 'Nu există niciun articol cu acest ID în magazin.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const name = interaction.options.getString('nume');
  const price = interaction.options.getInteger('pret');
  const description = interaction.options.getString('descriere');
  const role = interaction.options.getRole('rol');
  const noRole = interaction.options.getBoolean('fara_rol') ?? false;
  const stock = interaction.options.getInteger('stoc');
  const oneTime = interaction.options.getBoolean('o_singura_data');

  if (
    name === null &&
    price === null &&
    description === null &&
    !role &&
    !noRole &&
    stock === null &&
    oneTime === null
  ) {
    return interaction.reply({
      content: 'Specifică cel puțin o modificare.',
      flags: MessageFlags.Ephemeral,
    });
  }

  if (role && noRole) {
    return interaction.reply({
      content: 'Nu poți seta un rol și simultan să elimini rolul.',
      flags: MessageFlags.Ephemeral,
    });
  }

  if (name !== null && !name.trim()) {
    return interaction.reply({
      content: 'Numele articolului nu poate fi gol.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const problem = roleProblem(interaction.guild, role);
  if (problem) {
    return interaction.reply({ content: problem, flags: MessageFlags.Ephemeral });
  }

  const patch = {};
  if (name !== null) patch.name = name.trim();
  if (price !== null) patch.price = price;
  if (description !== null) patch.description = description.trim() || null;
  if (role) patch.roleId = role.id;
  if (noRole) patch.roleId = null;
  if (stock !== null) patch.stock = stock < 0 ? null : stock;
  if (oneTime !== null) patch.oneTime = oneTime;

  const updated = updateItem(item.id, patch);
  flush();

  await interaction.reply({
    content: `Articolul **${updated.name}** (\`${updated.id}\`) a fost actualizat.`,
    flags: MessageFlags.Ephemeral,
  });

  await sendShopAdminLog(interaction.guild, {
    title: 'Magazin — articol actualizat',
    description: `${interaction.user.tag} (${interaction.user.id})`,
    color: 0xfee75c,
    fields: [
      { name: 'Articol', value: `${updated.name} (${updated.id})`, inline: true },
      {
        name: 'Preț',
        value: `${formatAmount(updated.price)} ${config.economy.currency}`,
        inline: true,
      },
      {
        name: 'Stoc',
        value: updated.stock === null ? 'nelimitat' : String(updated.stock),
        inline: true,
      },
    ],
  });
}

async function removeItem(interaction) {
  const id = normalizeId(interaction.options.getString('id', true));
  const item = getItem(id);

  if (!item || item.guildId !== interaction.guild.id) {
    return interaction.reply({
      content: 'Nu există niciun articol cu acest ID în magazin.',
      flags: MessageFlags.Ephemeral,
    });
  }

  deleteItem(item.id);
  flush();

  await interaction.reply({
    content: `Articolul **${item.name}** (\`${item.id}\`) a fost șters din magazin.`,
    flags: MessageFlags.Ephemeral,
  });

  await sendShopAdminLog(interaction.guild, {
    title: 'Magazin — articol șters',
    description: `${interaction.user.tag} (${interaction.user.id})`,
    color: 0xed4245,
    fields: [{ name: 'Articol', value: `${item.name} (${item.id})` }],
  });
}

async function listItems(interaction) {
  const items = getItems(interaction.guild.id);
  if (!items.length) {
    return interaction.reply({
      content: 'Magazinul este gol. Folosește `/shop-admin adauga` pentru primul articol.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('Articolele magazinului')
    .setFooter({
      text: `${items.length} articole • Moneda: ${config.economy.currency}`,
    });

  for (const item of items.slice(0, 20)) {
    embed.addFields(itemField(item));
  }

  if (items.length > 20) {
    embed.setDescription(`Sunt afișate primele 20 de articole din ${items.length}.`);
  }

  return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

module.exports = {
  category: 'Economie',
  data: new SlashCommandBuilder()
    .setName('shop-admin')
    .setDescription('Administrează magazinul serverului')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('adauga')
        .setDescription('Adaugă un articol în magazin')
        .addStringOption((option) =>
          option
            .setName('nume')
            .setDescription('Numele articolului')
            .setRequired(true)
            .setMaxLength(80),
        )
        .addIntegerOption((option) =>
          option
            .setName('pret')
            .setDescription(`Prețul în ${config.economy.currency}`)
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(1_000_000),
        )
        .addStringOption((option) =>
          option.setName('descriere').setDescription('Descrierea').setMaxLength(500),
        )
        .addRoleOption((option) =>
          option.setName('rol').setDescription('Rolul acordat la cumpărare'),
        )
        .addIntegerOption((option) =>
          option
            .setName('stoc')
            .setDescription('Stocul (gol = nelimitat)')
            .setMinValue(0)
            .setMaxValue(100_000),
        )
        .addBooleanOption((option) =>
          option
            .setName('o_singura_data')
            .setDescription('O singură achiziție per membru (implicit: da)'),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('editeaza')
        .setDescription('Modifică un articol existent')
        .addStringOption((option) =>
          option
            .setName('id')
            .setDescription('ID-ul articolului')
            .setRequired(true)
            .setMaxLength(32),
        )
        .addStringOption((option) =>
          option.setName('nume').setDescription('Nume nou').setMaxLength(80),
        )
        .addIntegerOption((option) =>
          option
            .setName('pret')
            .setDescription(`Preț nou în ${config.economy.currency}`)
            .setMinValue(1)
            .setMaxValue(1_000_000),
        )
        .addStringOption((option) =>
          option.setName('descriere').setDescription('Descriere nouă').setMaxLength(500),
        )
        .addRoleOption((option) =>
          option.setName('rol').setDescription('Rol nou acordat la cumpărare'),
        )
        .addBooleanOption((option) =>
          option.setName('fara_rol').setDescription('Elimină rolul acordat'),
        )
        .addIntegerOption((option) =>
          option
            .setName('stoc')
            .setDescription('Stoc nou (-1 = nelimitat)')
            .setMinValue(-1)
            .setMaxValue(100_000),
        )
        .addBooleanOption((option) =>
          option.setName('o_singura_data').setDescription('O singură achiziție per membru'),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('sterge')
        .setDescription('Șterge un articol din magazin')
        .addStringOption((option) =>
          option
            .setName('id')
            .setDescription('ID-ul articolului')
            .setRequired(true)
            .setMaxLength(32),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('lista').setDescription('Listează articolele magazinului'),
    ),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content: 'Ai nevoie de permisiunea Manage Server pentru asta.',
        flags: MessageFlags.Ephemeral,
      });
    }

    switch (interaction.options.getSubcommand()) {
      case 'adauga':
        return addItem(interaction);
      case 'editeaza':
        return editItem(interaction);
      case 'sterge':
        return removeItem(interaction);
      case 'lista':
        return listItems(interaction);
      default:
        return undefined;
    }
  },
};
