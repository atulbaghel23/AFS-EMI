async function run() {
  const machine = {
    name: 'tessss2',
    category: 'Crawler',
    model: 'ssss2',
    img: 'base64_fake_image_data',
    images: ['base64_fake_image_data'],
    pricing: {},
    attachments: [],
    warranty: {},
    specs: { fuelType: 'Diesel' }
  };

  const res = await fetch('https://afs-emi.vercel.app/api/machines', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(machine)
  });

  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

run().catch(console.error);
