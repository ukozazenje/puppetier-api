const cheerio = require("cheerio");
const puppeteer = require("puppeteer");

// Helper function to auto-scroll the page
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      let totalHeight = 0;
      const distance = 300; // scroll 300 pixels at a time
      const delay = 50; // wait 50ms between scrolls
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, delay);
    });
  });
}

function getIdFromUrl(url) {
  const lastSlashIndex = url.lastIndexOf("/");
  return lastSlashIndex !== -1 ? url.substring(lastSlashIndex + 1) : url;
}

exports.GetPlanes = async (req, res, next) => {
  const { scrapeUrl } = req.body;

  const params = new URLSearchParams(scrapeUrl);
  const currentPage = params.get("page") || 1;

  const url = `https://aircraftforsale.com/aircraft${scrapeUrl}`;
  console.log("url: ", url);
  console.log("scrapeUrl: ", scrapeUrl);
  const planes = [];

  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      timeout: 60000,
    });

    const page = await browser.newPage();
    await page.goto(url, {
      waitUntil: "networkidle0",
      timeout: 60000,
    });

    // Scroll down to force lazy-loading of images
    await autoScroll(page);

    const pageContent = await page.content();
    const $ = cheerio.load(pageContent);
    await browser.close();

    $('div[class^="ListingCard_root__"]').each((index, element) => {
      // Check if plane is featured
      let featured = false;
      if (
        $(element)
          .attr("class")
          ?.match(/\bListingCard_isFeatured__/)
      ) {
        featured = true;
      }
      // Extract plane data
      const link = $(element)
        .find('a[class^="ListingCard_rootLink__"]')
        .attr("href");
      const id = getIdFromUrl(link);

      const title = $(element)
        .find('[class^="ListingCard_title__"]')
        .text()
        .trim();

      const category = $(element)
        .find('[class^="ListingCard_category__"]')
        .text()
        .trim();

      const price = $(element)
        .find('[class^="PriceDifference_lastPrice__"]')
        .text()
        .trim();

      const image = $(element)
        .find('img[class^="ListingCard_rootForImage__"]')
        .attr("srcset");

      planes.push({
        id: id,
        link: link,
        title: title,
        category: category,
        price: price,
        image: image,
        featured: featured,
      });
    });

    // Pagination
    const paginationElement = $('[class^="PaginationLinks_pageNumberList__"]');
    const totalPages = $(paginationElement)
      .find('[class^="PaginationLinks_toPageLink__"]')
      .last()
      .text();
    console.log("totalPages: ", totalPages);
    const pagination = {
      page: +currentPage,
      totalPages: +totalPages,
    };

    const categories = await fetch(
      "https://aircraftforsale.com/api/airplanes/categories"
    ).then((response) => response.json());

    return res.json({ status: true, data: planes, pagination, categories });
  } catch (error) {
    console.error("Error scraping planes:", error);
    res.status(500).json({ status: false, message: "Error scraping planes" });
  }
};

exports.GetPlane = async (req, res, next) => {
  const { scrapeUrl } = req.body;
  console.log("scrapeUrl: ", scrapeUrl);

  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      timeout: 60000,
    });

    const page = await browser.newPage();
    await page.goto(
      `https://aircraftforsale.com/api/brokers/get-dealer-listing${scrapeUrl}`,
      {
        waitUntil: "networkidle0",
        timeout: 60000,
      }
    );

    const pageContent = await page.content();
    await browser.close();
    console.log("page content: ", pageContent);

    return res.json({ status: true, data: {} });
  } catch (error) {
    console.error("Error scraping plane:", error);
    res.status(500).json({ status: false, message: "Error scraping plane" });
  }
};
