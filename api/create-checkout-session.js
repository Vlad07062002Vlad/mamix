// File: /api/create-checkout-session.js — Coinbase Commerce version

const commerce = require('@coinbase/commerce-node');
const { Client, resources } = commerce;
const { Charge } = resources;

Client.init(process.env.COINBASE_API_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, plan, family_size, preferences, ingredients } = req.body;

  const priceMap = {
    single: { amount: '0.50', currency: 'USD' },
    pack5:  { amount: '2.00', currency: 'USD' },
    sub:    { amount: '4.99', currency: 'USD' }
  };

  const price = priceMap[plan] || priceMap.single;

  try {
    const charge = await Charge.create({
      name: 'MamMix Meal Plan',
      description: `Weekly AI meal planner — ${plan} plan`,
      pricing_type: 'fixed_price',
      local_price: price,
      metadata: { email, plan, family_size, preferences, ingredients },
      redirect_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cancel`
    });

    return res.status(200).json({ hosted_url: charge.hosted_url });
  } catch (err) {
    console.error('Coinbase Charge Error:', err);
    return res.status(500).json({ error: 'Failed to create charge' });
  }
};
