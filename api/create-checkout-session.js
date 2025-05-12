const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * @param {import('vercel').VercelRequest} req
 * @param {import('vercel').VercelResponse} res
 */
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ingredients } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'MamMix Meal Plan',
              description: '7-day AI-generated menu based on your ingredients',
            },
            unit_amount: 50,
          },
          quantity: 1,
        },
      ],
      success_url: 'https://mamix-virid.vercel.app/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://mamix-virid.vercel.app/cancel',
      metadata: { ingredients },
    });

    res.status(200).json({ sessionId: session.id });
  } catch (err) {
    console.error('Stripe error:', err.message || err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
