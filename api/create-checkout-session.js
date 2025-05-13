// File: /api/create-checkout-session.js

const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, plan, family_size, preferences, ingredients } = req.body;
    const priceMap = {
      single: 50,    // $0.50 one-time
      pack5: 200     // $2.00 one-time
    };

    // 1) Find or create Stripe Customer by email
    let customer;
    const existing = await stripe.customers.list({ email, limit: 1 });
    if (existing.data.length > 0) {
      customer = existing.data[0];
    } else {
      customer = await stripe.customers.create({ email });
    }

    // 2) Determine base URL for redirects
    const origin = req.headers.origin || `https://${req.headers.host}`;

    // 3) Configure Checkout session parameters
    let sessionParams = {
      customer: customer.id,
      customer_email: email,
      metadata: { plan, family_size, preferences, ingredients },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/cancel`
    };

    if (plan === 'sub') {
      // Monthly subscription (use pre-created Price ID)
      sessionParams.mode = 'subscription';
      sessionParams.line_items = [
        { price: process.env.SUBSCRIPTION_PRICE_ID, quantity: 1 }
      ];
    } else {
      // One-time payment for single or 5-pack
      sessionParams.mode = 'payment';
      sessionParams.line_items = [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `MamMix • ${plan}` },
            unit_amount: priceMap[plan]
          },
          quantity: 1
        }
      ];
    }

    // 4) Create the Checkout session
    const session = await stripe.checkout.sessions.create(sessionParams);

    return res.status(200).json({ sessionId: session.id });
  } catch (err) {
    console.error('Stripe session error:', err);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
};
