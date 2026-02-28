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
// EXPRESS (Railway)
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
  // BOTÕES
  // =====================
  if (interaction.isButton()) {

    const guild = interaction.guild;
    const member = interaction.member;

    // ===================================
    // BOTÃO 1 - CRIAR TICKET
    // ===================================
    if (interaction.customId === 'iniciar_verificacao') {

      let category = guild.channels.cache.find(
        c => c.name === '🔐 Verificações' && c.type === ChannelType.GuildCategory
      );

      if (!category) {
        category = await guild.channels.create({
          name: '🔐 Verificações',
          type: ChannelType.GuildCategory
        });
      }

      const existingChannel = guild.channels.cache.find(
        c => c.name === `verificacao-${member.user.id}`
      );

      if (existingChannel) {
        return interaction.reply({
          content: `Você já possui um ticket aberto em ${existingChannel}.`,
          ephemeral: true
        });
      }

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

      const startButton = new ButtonBuilder()
        .setCustomId('comecar_verificacao')
        .setLabel('Começar verificação')
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder().addComponents(startButton);

      const embedInicio = new EmbedBuilder()
  .setTitle('🔐 Painel de Verificação')
  .setDescription(
    `Olá ${member}, seja bem-vindo ao nosso painel de verificação!\n\n` +
    `Para garantir a segurança do sistema, informamos que o código gerado poderá ser utilizado para verificar **apenas uma única pessoa**.\n\n` +
    `⚠️ **Atenção:** Caso você compartilhe o código com outra pessoa, a verificação falhará automaticamente e será necessário aguardar a análise manual da nossa equipe.\n\n` +
    `Portanto, mantenha seu código em segurança e não o compartilhe com ninguém.\n\n` +
    `Clique no botão abaixo para iniciar sua verificação.`
  )
  .setColor(0x2b2d31)
  .setFooter({ text: 'Sistema automático de verificação' });

await channel.send({
  embeds: [embedInicio],
  components: [row]
});

      await interaction.reply({
        content: `✅ Seu ticket foi criado em ${channel}`,
        ephemeral: true
      });
    }

    // ===================================
    // BOTÃO 2 - GERAR CÓDIGO
    // ===================================
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
});

client.login(process.env.TOKEN);
