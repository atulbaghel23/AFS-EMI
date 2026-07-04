import puppeteer from 'puppeteer';

async function testLaunch() {
  console.log("Attempting to launch Puppeteer without channel: 'chrome'...");
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log("Success! Puppeteer launched successfully without channel specification.");
    await browser.close();
  } catch (error) {
    console.error("Failed to launch Puppeteer without channel:", error);
  }
}

testLaunch();
