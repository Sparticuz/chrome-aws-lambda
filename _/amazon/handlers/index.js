const { ok } = require('assert');
const { createHash } = require('crypto');
const chromium = require('@sparticuz/chrome-aws-lambda');
// const chromium = require('/var/task/node_modules/@sparticuz/chrome-aws-lambda');
const { writeFile, mkdir, access } = require('fs/promises');
const { constants } = require("fs");

exports.handler = async (event, context) => {
  let browser = null;

  await access('/tmp/artifacts', constants.F_OK).catch(async ()=>{await mkdir('/tmp/artifacts')});
  console.log('banana');

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

    console.log(event.length, contexts.length);

    for (let context of contexts) {
      const job = event.shift();
      const page = await context.defaultPage();

      if (job.hasOwnProperty('url') === true) {

        console.log(job.url);

        await page.goto(job.url, { waitUntil: "networkidle0" });

        if (job.hasOwnProperty('expected') === true) {
          if (job.expected.hasOwnProperty('title') === true) {
            ok(await page.title() === job.expected.title, `Title assertion failed.`);
          }

          if (job.expected.hasOwnProperty('screenshot') === true) {
            ok(createHash('sha1').update((await page.screenshot()).toString('base64')).digest('hex') === job.expected.screenshot, `Screenshot assertion failed.`);
          }

          if (job.expected.hasOwnProperty('pdf') === true) {
            const pdf = await page.pdf();
            console.log(pdf.toString('base64'));
            await writeFile(job.expected.pdf, pdf);

            try {
              await access(job.expected.pdf, constants.F_OK);
              console.log('file written');
            } catch(error) {
              console.log("file not written", error);
              ok(false, `PDF Failed to write`);
            };

          }
        }
      }

      await page.close();
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
