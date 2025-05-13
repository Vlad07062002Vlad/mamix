// File: /api/create-checkout-session.js

const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Determine the base URL dynamically
    const origin = req.headers.origin || `https://${req.headers.host}`;

    // Extract request data
    const { email, plan, family_size, preferences, ingredients } = req.body;
    const priceMap = { single: 50, pack5: 200, sub: 499 };

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: plan === 'sub' ? 'subscription' : 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `MamMix • ${plan}` },
            unit_amount: priceMap[plan],
          },
          quantity: 1,
        },
      ],
      customer_email: email,
      metadata: { plan, family_size, preferences, ingredients },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel`,
    });

    res.status(200).json({ sessionId: session.id });
  } catch (err) {
    console.error('Stripe session error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
};
