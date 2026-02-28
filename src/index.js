require('dotenv').config();

const express = require('express');
const crypto = require('crypto');

const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ChannelType,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  Events,
  REST,
  Routes,
  SlashCommandBuilder
} = require('discord.js');


// =======================
// EXPRESS (API Railway)
// =======================

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('API do Bot funcionando 🚀');
});

app.listen(PORT, () => {
  console.log(`Servidor HTTP rodando na porta ${PORT}`);
});


// =======================
// DISCORD BOT
// =======================

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', async () => {
  console.log(`🤖 Bot online como ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName('painelverificacao')
      .setDescription('Envia o painel de verificação.')
      .toJSON()
  ];

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );

    console.log('✅ Slash command registrado.');
  } catch (error) {
    console.error(error);
  }
});


// =======================
// INTERAÇÕES
// =======================

client.on(Events.InteractionCreate, async interaction => {

  // =====================
  // SLASH COMMAND
  // =====================
  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === 'painelverificacao') {

      const embed = new EmbedBuilder()
        .setTitle('📋 Sistema de Verificação')
        .setDescription('Clique no botão abaixo para iniciar sua verificação.')
        .setColor(0x2b2d31);

      const button = new ButtonBuilder()
        .setCustomId('iniciar_verificacao')
        .setLabel('Verificar-se')
        .setStyle(ButtonStyle.Success);

      const row = new ActionRowBuilder().addComponents(button);

      await interaction.reply({
        embeds: [embed],
        components: [row]
      });
    }
  }

  // =====================
  // BOTÃO
  // =====================
  if (interaction.isButton()) {

  const guild = interaction.guild;
  const member = interaction.member;

  // ===============================
  // BOTÃO 1 - CRIAR TICKET
  // ===============================
  if (interaction.customId === 'iniciar_verificacao') {

    // Procurar categoria
    let category = guild.channels.cache.find(
      c => c.name === '🔐 Verificações' && c.type === ChannelType.GuildCategory
    );

    if (!category) {
      category = await guild.channels.create({
        name: '🔐 Verificações',
        type: ChannelType.GuildCategory
      });
    }

    // Verificar se já tem ticket
    const existingChannel = guild.channels.cache.find(
      c => c.name === `verificacao-${member.user.id}`
    );

    if (existingChannel) {
      return interaction.reply({
        content: `Você já possui um ticket aberto em ${existingChannel}.`,
        ephemeral: true
      });
    }

    // Criar canal privado
    const channel = await guild.channels.create({
      name: `verificacao-${member.user.id}`,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: member.id,
          allow: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: client.user.id,
          allow: [PermissionsBitField.Flags.ViewChannel]
        }
      ]
    });

    // Botão começar verificação
    const startButton = new ButtonBuilder()
      .setCustomId('comecar_verificacao')
      .setLabel('Começar verificação')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(startButton);

    await channel.send({
      content: `👋 Olá ${member}, clique no botão abaixo para começar sua verificação.`,
      components: [row]
    });

    await interaction.reply({
      content: `✅ Seu ticket foi criado em ${channel}`,
      ephemeral: true
    });
  }

  // ===============================
  // BOTÃO 2 - GERAR CÓDIGO
  // ===============================
  if (interaction.customId === 'comecar_verificacao') {

    const code = crypto.randomBytes(4).toString('hex').toUpperCase();

    const embed = new EmbedBuilder()
      .setTitle('🔐 Código de Verificação')
      .setDescription(
        `Seu código é:\n\n` +
        `\`\`\`\n${code}\n\`\`\`\n\n` +
        `Use este código no jogo do Roblox.\n` +
        `⚠️ Não compartilhe com ninguém.`
      )
      .setColor(0x00ff00);

    await interaction.reply({
      embeds: [embed]
    });
  }
}

      // Verificar se já existe canal para esse usuário
      const existingChannel = guild.channels.cache.find(
        c => c.name === `verificacao-${member.user.username}`
      );

      if (existingChannel) {
        return interaction.reply({
          content: 'Você já possui um ticket aberto.',
          ephemeral: true
        });
      }

      // Criar canal privado
      const channel = await guild.channels.create({
        name: `verificacao-${member.user.username}`,
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel]
          },
          {
            id: member.id,
            allow: [PermissionsBitField.Flags.ViewChannel]
          },
          {
            id: client.user.id,
            allow: [PermissionsBitField.Flags.ViewChannel]
          }
        ]
      });

      // Gerar código seguro (8 caracteres reais)
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();

      const embed = new EmbedBuilder()
        .setTitle('🔐 Verificação Iniciada')
        .setDescription(
          `Seu código de verificação é:\n\n` +
          `\`\`\`\n${code}\n\`\`\`\n\n` +
          `Use este código no jogo do Roblox.\n` +
          `⚠️ Este código poderá ser usado apenas uma vez.`
        )
        .setColor(0x00ff00);

      await channel.send({ embeds: [embed] });

      await interaction.reply({
        content: 'Seu ticket foi criado!',
        ephemeral: true
      });
    }
  }
});

client.login(process.env.TOKEN);
