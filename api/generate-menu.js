// File: /api/generate-menu.js

-  // 1) достаём Stripe-сессию
-  const session = await stripe.checkout.sessions.retrieve(session_id);
-  const customerId = session.customer;
-  const { plan, family_size, preferences, ingredients } = session.metadata;
-
-  // 2) получаем или инициализируем кредиты
-  const customer = await stripe.customers.retrieve(customerId);
-  let credits = parseInt(customer.metadata.credits || '0', 10);
-  if (credits <= 0) {
-    credits = plan === 'pack5' ? 5 : plan === 'sub' ? 10 : 1;
-  }
-  // 3) списываем один кредит
-  credits -= 1;
-  if (credits < 0) {
-    return res.status(402).json({ error: 'No credits left' });
-  }
-  // 4) сохраняем обновлённое число кредитов
-  await stripe.customers.update(customerId, {
-    metadata: { credits: credits.toString() }
-  });

+  // 1) достаём Stripe-сессию и метаданные
+  const session = await stripe.checkout.sessions.retrieve(session_id);
+  const { plan, family_size, preferences, ingredients } = session.metadata;
+
+  // 2) вычисляем оставшиеся кредиты
+  let credits;
+  if (session.customer) {
+    // если есть customer, достаём и обновляем metadata
+    const customer = await stripe.customers.retrieve(session.customer);
+    credits = parseInt(customer.metadata.credits || '0', 10);
+    if (credits <= 0) {
+      credits = plan === 'pack5' ? 5 : plan === 'sub' ? 10 : 1;
+    }
+    credits -= 1;
+    if (credits < 0) {
+      return res.status(402).json({ error: 'No credits left' });
+    }
+    await stripe.customers.update(session.customer, {
+      metadata: { credits: credits.toString() }
+    });
+  } else {
+    // одноразовый платёж — даём ровно один запрос
+    credits = 0; // после первого запроса кредитов больше не остаётся
+  }

   // 5) формируем промпт к OpenAI
   const prompt = 
     `You are an AI meal planner. Cooking for ${family_size} people. ` +
     `Dietary preferences: ${preferences}. ` +
     `Available ingredients: ${ingredients}.\n\n` +
     `Create a simple 7-day meal plan (breakfast, lunch, dinner) scaled ` +
     `to that number of people. Separately list additional items to buy ` +
     `with an approximate average cost.`;

   // 6) вызываем OpenAI
   const completion = await openai.chat.completions.create({
     model: 'gpt-4o',
     messages: [{ role: 'user', content: prompt }],
     temperature: 0.7,
   });
   const menu = completion.choices[0].message.content;

-  // 7) возвращаем меню + сколько осталось кредитов
-  return res.status(200).json({ menu, credits_left: credits });
+  // 7) возвращаем меню + оставшиеся кредиты (для одноразового — 0)
+  return res.status(200).json({ menu, credits_left: credits });
