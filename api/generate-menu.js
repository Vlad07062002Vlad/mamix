// File: /api/generate-menu.js

const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Handles menu generation after successful payment
 * @param {import('vercel').VercelRequest} req
 * @param {import('vercel').VercelResponse} res
 */
module.exports = async (req, res) => {
  const { session_id } = req.query;

  if (!session_id) {
    return res.status(400).json({ error: 'Missing session_id' });
  }

  try {
    // Retrieve Stripe session metadata for ingredients
    const session = await stripe.checkout.sessions.retrieve(session_id);
    const ingredients = session.metadata.ingredients || '';

    // English prompt: generate a weekly meal plan and shopping details
    const prompt = `Based on the following ingredients: ${ingredients}
Create a simple 7-day meal plan with breakfast, lunch, and dinner for each day.
Separately list which additional ingredients need to be purchased and provide an approximate average cost for those items.`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    // Extract and return menu
    const menu = completion.choices[0].message.content;
    return res.status(200).json({ menu });
  } catch (err) {
    console.error('Generate menu error:', err);
    return res.status(500).json({ error: 'Failed to generate menu' });
  }
};
