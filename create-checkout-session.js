import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
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
            unit_amount: 3,
          },
          quantity: 1,
        },
      ],
      success_url: 'https://mamix-landing.vercel.app/success',
      cancel_url: 'https://mamix-landing.vercel.app/cancel',
      metadata: {
        ingredients,
      },
    });

    res.status(200).json({ sessionId: session.id });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
