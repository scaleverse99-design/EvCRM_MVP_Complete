/**
 * CTE Newsletter Subscriber Controller
 */

document.getElementById('email-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const emailInput = document.getElementById('email-input');
  const email = emailInput.value.trim();

  if (!email) return;

  try {
    const res = await fetch('/api/v1/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });

    const data = await res.json();

    if (data.success) {
      alert('✓ Subscribed successfully! Thank you for backing e-commerce transparency.');
      emailInput.value = '';
    } else {
      alert('Error: ' + (data.error || 'Subscription failed. Please try again.'));
    }
  } catch (err) {
    console.error('Subscription error:', err);
    alert('Failed to connect to subscription service. Please try again.');
  }
});
