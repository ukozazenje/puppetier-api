const axios = require("axios");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");

exports.GetYachts = (req, res, next) => {
  const { scrapeUrl } = req.body;

  console.log("scrapeUrl", scrapeUrl);
  // console.log("url", `https://www.nestseekers.com/yachts-for-sale/${scrapeUrl}`)

  axios
    .get(`https://www.nestseekers.com/yachts-for-sale/${scrapeUrl}`)
    .then((response) => {
      const $ = cheerio.load(response.data);
      const yachts = [];
      $(".pagination a").each((index, element) => {
        const href = $(element).attr("href");
        if (href) {
          // Use regex to extract only the query string (e.g., ?oby=pk&page=139)
          const cleanHref = href.match(/\?.*$/)[0]; // Match everything starting with '?' and keep it
          $(element).attr("href", cleanHref); // Set the href to the cleaned value
        }
      });

      // Remove <thead> and <tbody> from the pagination
      $("thead, tbody").remove();

      // Fetch the pagination HTML after modifications
      const paginationSortHtml = $(".pagination").html();

      $(".ny__yacht").each((index, element) => {
        // Extract yacht data
        const yachtLink =
          $(element).find(".ny__yacht__img a").attr("href") || "";
        const yachtIdMatch = yachtLink.match(/\/yacht\/(\d+)\//);
        const yachtId = yachtIdMatch ? yachtIdMatch[1] : null;

        const title = $(element).find(".ny__yacht__info-left h1").text().trim();
        const priceDisplay = $(element).find(".ny-price").html(); // Get price HTML
        const priceText = $(element)
          .find(".ny-price")
          .text()
          .replace(/[^\d]/g, "");
        const price = priceText ? parseFloat(priceText) : null;

        // Extract the feet value by cloning and removing the <small> element
        const lengthFeet = $(element)
          .find(".ny-length")
          .clone() // clone the element to work on a copy
          .children() // select the child elements (<small> in this case)
          .remove() // remove them from the cloned copy
          .end() // return to the cloned parent element
          .text() // get the text (only the feet value now)
          .trim();

        // Extract the meters value from the <small> element
        const lengthMeters = $(element)
          .find(".ny-length small")
          .text()
          .replace(/[()M]/g, "") // remove parentheses and "M" if present
          .trim();

        const manufacturer = $(element).find(".ny-model").text().trim();
        const year = $(element).find(".ny-year").text().trim();

        const cabinCount =
          parseInt(
            $(element)
              .find(".ny__yacht__rooms .ny-rooms:first-child")
              .text()
              .replace(/\D/g, "")
          ) || 0;
        const sleepCount =
          $(element)
            .find(".ny__yacht__rooms .ny-rooms:nth-child(2)")
            .text()
            .replace(/\D/g, "") || 0;
        const crewCount =
          $(element)
            .find(".ny__yacht__rooms .ny-rooms:nth-child(3)")
            .text()
            .replace(/\D/g, "") || 0;

        const thumbUrl = $(element)
          .find(".ny__yacht__img .ny-img")
          .css("background-image")
          .replace(/url\("(.+)"\)/, "$1");

        // Construct yacht object with a combined length display
        yachts.push({
          yacht_id: yachtId ? parseInt(yachtId) : null,
          is_charter: false,
          slug: yachtLink.replace("/yacht/", "").replace(/\//g, ""),
          vessel_name: title,
          price_display: priceDisplay,
          price: price || null,
          length_meters: lengthMeters ? parseFloat(lengthMeters) : null,
          // Combine feet and meters into one display string:
          // e.g., "53' [16.15M]" if both are available, or just "53'" otherwise.
          length_display:
            lengthFeet + (lengthMeters ? " [" + lengthMeters + "M]" : ""),
          cabin_count: cabinCount,
          sleep_count: parseInt(sleepCount),
          head_count: 0,
          crew_head_count: 0,
          crew_sleep_count: parseInt(crewCount),
          year: year ? parseInt(year) : null,
          refit_year: null,
          vessel_type: "Power",
          vessel_manufacturer: manufacturer,
          vessel_category: "Motor Yachts",
          vessel_subcategory: null,
          city: "Antalya",
          state: null,
          country: "TURKEY",
          thumb_urls: {
            primary: thumbUrl,
            large: thumbUrl,
          },
        });
      });

      res.json({ status: true, data: yachts, pagination: paginationSortHtml });
    })
    .catch((error) => {
      console.error("Error scraping yachts:", error);
      res.status(500).json({ status: false, message: "Error scraping yachts" });
    });
};

exports.GetYacht = async (req, res, next) => {
  const { scrapeUrl } = req.body;

  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      timeout: 60000,
    });

    const page = await browser.newPage();
    await page.goto(`https://www.nestseekers.com${scrapeUrl}`, {
      waitUntil: "networkidle0",
      timeout: 60000,
    });

    // Click the yacht-gallery-btn to load all images
    await page.evaluate(() => {
      const galleryBtn = document.querySelector(".yacht-gallery-btn");
      if (galleryBtn) {
        galleryBtn.click();
      }
    });

    // Wait for the images to load
    await page.waitForSelector(".yacht-gallery-item", { timeout: 10000 });

    // Wait for the full gallery to load
    await page.waitForSelector(".yacht-carousel-img", { timeout: 10000 });

    // Extract the gallery data
    const galleryData = await page.evaluate(() => {
      const pics = Array.from(
        document.querySelectorAll(".yacht-carousel-img img")
      ).map((img) => ({
        src: img.src,
      }));

      return {
        pics,
      };
    });

    const pageContent = await page.content();
    await browser.close();

    const $ = cheerio.load(pageContent);
    // Extract the title and clean it
    const titleElement = $(".yacht-title-section h1.my-1").first(); // Select the first matching element
    const title = titleElement.text().trim(); // Get the text and trim whitespace

    const priceDiv = $(".yacht-number-detail").filter(function () {
      return $(this).text().includes("PRICE");
    });

    // Find the main container for details
    const yachtDetailsMainSection = $(".yacht-full-details-section.p-4");
    const detailsHidden = yachtDetailsMainSection.find(".details-hidden");
    const yachtSummary = $(".yacht-summary-details-section").html();
    const yachtNumbersSection = $(".yacht-numbers-section").html();
    const yachtData = {
      yachtSummary: yachtSummary,
      yachtNumbersSection: yachtNumbersSection,
      price: priceDiv.find("div").last().html(),
      characteristics: yachtDetailsMainSection
        .find(".category-filters")
        .next()
        .html(),
      dimensions: detailsHidden.eq(0).html(),
      speed: detailsHidden.eq(1).html(),
      desk: detailsHidden.eq(2).html(),
      yacht_details: $(".yacht-outer").html(),
      yacht_overview_section: $(".yacht-overview-section").html(),
      carousel: galleryData,
      title: title, // Use the extracted title here
      gallery: {
        pics: $(".yacht-gallery-item")
          .map((i, el) => ({
            title: "",
            imgurl: $(el)
              .css("background-image")
              .replace(/url\("(.+)"\)/, "$1"),
            full: $(el)
              .css("background-image")
              .replace(/url\("(.+)"\)/, "$1"),
            tiny: $(el)
              .css("background-image")
              .replace(/url\("(.+)"\)/, "$1"),
          }))
          .get(),
        first: {
          title: "",
          imgurl: $(".yacht-gallery-item")
            .first()
            .css("background-image")
            .replace(/url\("(.+)"\)/, "$1"),
          full: $(".yacht-gallery-item")
            .first()
            .css("background-image")
            .replace(/url\("(.+)"\)/, "$1"),
          tiny: $(".yacht-gallery-item")
            .first()
            .css("background-image")
            .replace(/url\("(.+)"\)/, "$1"),
        },
      },
    };

    return res.json({ status: true, data: yachtData });
  } catch (error) {
    console.error("Error scraping yacht:", error);
    res.status(500).json({ status: false, message: "Error scraping yacht" });
  }
};
