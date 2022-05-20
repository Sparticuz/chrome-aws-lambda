const { ok } = require('assert');
const { createHash } = require('crypto');
const chromium = require('@sparticuz/chrome-aws-lambda');
const { writeFile, mkdir, access } = require('fs/promises');
const { constants } = require("fs");

exports.handler = async (event, context) => {
  let browser = null;

  await mkdir('/tmp/artifacts');

  try {
    const browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const contexts = [
      browser.defaultBrowserContext(),
    ];

    while (contexts.length < event.length) {
      contexts.push(await browser.createIncognitoBrowserContext());
    }

    for (let context of contexts) {
      const job = event.shift();
      const page = await context.defaultPage();

      if (job.hasOwnProperty('url') === true) {
        await page.goto(job.url, { waitUntil: ['domcontentloaded', 'load'] });

        if (job.hasOwnProperty('expected') === true) {
          if (job.expected.hasOwnProperty('title') === true) {
            ok(await page.title() === job.expected.title, `Title assertion failed.`);
          }

          if (job.expected.hasOwnProperty('screenshot') === true) {
            ok(createHash('sha1').update((await page.screenshot()).toString('base64')).digest('hex') === job.expected.screenshot, `Screenshot assertion failed.`);
          }

          if (job.expected.hasOwnProperty('pdf') === true) {
            await writeFile(job.expected.pdf, await page.pdf());
            ok((await access(job.expected.pdf, constants.F_OK).then(()=>true).catch(()=>false)), `PDF Failed to write`);
          }
        }
      }
    }
  } catch (error) {
    throw error.message;
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }

  return true;
};
