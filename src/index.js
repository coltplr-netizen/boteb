require('dotenv').config();

const { 
  Client, 
  GatewayIntentBits, 
  PermissionsBitField, 
  ChannelType 
} = require('discord.js');

const express = require('express');
const mongoose = require('mongoose');

// =======================
// DISCORD CLIENT
// =======================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// =======================
// MONGODB
// =======================

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("🗄️ Conectado ao MongoDB"))
  .catch(err => console.error("Erro ao conectar no Mongo:", err));

const verificationSchema = new mongoose.Schema({
  discordId: String,
  robloxId: String,
  code: String,
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Verification = mongoose.model("Verification", verificationSchema);

// =======================
// EXPRESS API
// =======================

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API do Bot funcionando 🚀');
});

// =======================
// ROTA DE VERIFICAÇÃO
// =======================

app.post('/api/redeem', async (req, res) => {

  const { code, robloxId } = req.body;

  if (!code || !robloxId) {
    return res.status(400).json({ success: false, message: 'Dados inválidos.' });
  }

  const verification = await Verification.findOne({ code });

  if (!verification) {
    return res.status(404).json({ success: false, message: 'Código não encontrado.' });
  }

  if (verification.used) {
    return res.status(400).json({ success: false, message: 'Código já utilizado.' });
  }

  try {

    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    const member = await guild.members.fetch(verification.discordId);

    // DAR CARGO
    await member.roles.add(process.env.VERIFIED_ROLE_ID);

    // FECHAR TICKET
    const ticketChannel = guild.channels.cache.find(
      c => c.name === `verificacao-${verification.discordId}`
    );

    if (ticketChannel) {
      await ticketChannel.delete();
    }

    // MARCAR COMO USADO
    verification.used = true;
    verification.robloxId = robloxId;
    await verification.save();

    return res.json({
      success: true,
      message: 'Verificação realizada com sucesso!'
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Erro ao finalizar verificação.'
    });
  }

});

// =======================
// INICIAR SERVIDOR HTTP
// =======================

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`🌐 Servidor HTTP rodando na porta ${PORT}`);
});

// =======================
// DISCORD READY
// =======================

client.once('clientReady', () => {
  console.log(`🤖 Bot online como ${client.user.tag}`);
});

// =======================
// LOGIN
// =======================

client.login(process.env.TOKEN);
