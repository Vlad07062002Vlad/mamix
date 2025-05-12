// File: /api/generate-menu.js

const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const { Configuration, OpenAIApi } = require('openai');
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

module.exports = async (req, res) => {
  const { session_id } = req.query;

  if (!session_id) {
    return res.status(400).json({ error: 'Missing session_id' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    const ingredients = session.metadata.ingredients || '';

    const prompt = `На основе следующих продуктов: ${ingredients}\nСоставь простое меню на неделю (7 дней). Включи завтрак, обед и ужин для каждого дня. Отдельно выведи список покупок.`;

    const gptRes = await openai.createChatCompletion({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    const menu = gptRes.data.choices[0].message.content;
    res.status(200).json({ menu });
  } catch (err) {
    console.error('Generate menu error:', err.message);
    res.status(500).json({ error: 'Failed to generate menu' });
  }
};
