import { Telegraf, Markup } from "telegraf";
import axios from "axios";

const botToken = process.env.TELEGRAM_BOT_TOKEN || "";
const exchangeRateToken = process.env.EXCHANGE_RATE_API_KEY || "";

const bot = new Telegraf(botToken);

const userNames: { [key: number]: string } = {};
const awaitingName: { [key:number] : boolean } = {};

bot.use((ctx, next) => {
  const userId = ctx.from?.id || "no-id";
  ctx.state.userName = userNames[userId] || "пользователь";
  console.log(`Received message from user ${userId}`);
  return next();
})

bot.telegram.setMyCommands([
  { command: "start", description: "Приветствие бота" },
  { command: "rates", description: "Нынешний курс" }
])

bot.start(async(ctx) => {
  const userId = ctx.from?.id || "no-id";
  awaitingName[userId] = true;
  console.log(`Starting conversation with user ${userId}`);
  ctx.reply(
    "Добрый день. Как вас зовут?"
  )
})

bot.command("rates", async(ctx) => {
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('Рубль к доллару', 'RUB_USD')],
    [Markup.button.callback('Доллар к рублю', 'USD_RUB')],
    [Markup.button.callback('Тенге к доллару', 'KZT_USD')],
    [Markup.button.callback('Доллар к тенге', 'USD_KZT')],
    [Markup.button.callback('Тенге к рублю', 'KZT_RUB')],
    [Markup.button.callback('Рубль к тенге', 'RUB_KZT')],
  ]);

  ctx.reply(`Уважаемый ${ctx.state.userName}, выберите нужный вам курс:`, keyboard)
})

bot.action(/(RUB_USD|USD_RUB|KZT_USD|USD_KZT|KZT_RUB|RUB_KZT)/, async (ctx) => {
  const [fromCurrency, toCurrency] = ctx.match[0].split('_');
  try {
    const rate = await getExchangeRate(fromCurrency, toCurrency);
    ctx.reply(`1 ${fromCurrency} = ${rate} ${toCurrency}`);
  } catch (err) {
    ctx.reply('Извините, произошла ошибка. Попробуйте позже.');
  }
});

async function getExchangeRate(from: string, to: string): Promise<number> {
  try {
    const response = await axios.get(
      `https://v6.exchangerate-api.com/v6/${exchangeRateToken}/latest/${from}`
    );
    return response.data.conversion_rates[to];
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    throw error;
  }
}

bot.on("text", async (ctx) => {
  const userId = ctx.from.id;
  const messageText = ctx.message.text.trim();

  if (awaitingName[userId]) {
    if (messageText.length > 30) { 
      ctx.reply("Имя слишком длинное. Пожалуйста, введите имя короче 30 символов.");
    } else {
      userNames[userId] = messageText;
      awaitingName[userId] = false;
      ctx.reply(`Рад знакомству, ${userNames[userId]}!`);
    }
  }
});


export default bot;
