const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

module.exports = async (req, res) => {
  try {
    let session, plan, family_size, preferences, ingredients;
    let credits;

    if (req.method === 'GET' && req.query.session_id) {
      session = await stripe.checkout.sessions.retrieve(req.query.session_id);
      ({ plan, family_size, preferences, ingredients } = session.metadata);
    } else if (req.method === 'POST') {
      const { email, family_size: fam, preferences: prefs, ingredients: ingred } = req.body;
      plan = (await stripe.customers.list({ email, limit: 1 })).data[0].metadata.plan;
      family_size = fam;
      preferences  = prefs;
      ingredients  = ingred;
      session = { customer: (await stripe.customers.list({ email, limit: 1 })).data[0].id };
    } else {
      return res.status(400).json({ error: 'Bad request' });
    }

    // Calculate and update credits
    if (session.customer) {
      const customer = await stripe.customers.retrieve(session.customer);
      credits = parseInt(customer.metadata.credits || '0', 10);
      if (credits <= 0) {
        credits = plan === 'pack5' ? 5 : plan === 'sub' ? 10 : 1;
      }
      credits -= 1;
      if (credits < 0) {
        return res.status(402).json({ error: 'No credits left' });
      }
      await stripe.customers.update(session.customer, { metadata: { credits: credits.toString() } });
    } else {
      credits = 0;
    }

    // Build prompt
    const prompt =
      `You are an AI meal planner. Cooking for ${family_size} people.\n` +
      `Dietary preferences: ${preferences}.\n` +
      `Available ingredients: ${ingredients}.\n\n` +
      `Create a simple 7-day meal plan (breakfast, lunch, dinner) scaled to that number of people.\n` +
      `Separately list additional items to buy with an approximate average cost.`;

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });
    const menu = completion.choices[0].message.content;

    return res.status(200).json({ menu, credits_left: credits });
  } catch (err) {
    console.error('Generate menu error:', err);
    return res.status(500).json({ error: 'Failed to generate menu' });
  }
};
