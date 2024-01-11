const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors({ origin: '*' })); // Enable CORS for all origins

const port = 3007;
const fetchInterval = 30 * 60 * 1000; // 30 minutes in milliseconds

let cachedData = null;

async function fetchDataAndCache() {
  try {
    const now = new Date();
    const gmtTime = now.getUTCHours() + 5 + (now.getUTCMinutes() / 60); // GMT+5:30

    // Check if GMT+5:30 is between 9 PM and 11 PM
    if (gmtTime >= 21 && gmtTime <= 23) {
      const formData = {
        MFName: '-1'
      };

      const response = await axios.post('https://www.amfiindia.com/modules/NAVList', formData);

      // Ensure the request was successful
      if (response.status !== 200) {
        console.error('Failed to fetch data from the API');
        return;
      }

      const data = response.data;

      // Use Cheerio to parse the HTML content
      const $ = cheerio.load(data);

      // Extract data from the HTML table
      const tableData = [];
      $('#divExcel table tr').each((index, row) => {
        const rowData = $(row)
          .find('td')
          .map((i, col) => $(col).text().trim())
          .get();

        if (rowData.length > 0) {
          tableData.push({
            name: rowData[0],
            code1: rowData[1],
            code2: rowData[2],
            nav: rowData[3],
            navdate: rowData[4]
          });
        }
      });

      // Store the extracted data in the cached variable
      cachedData = tableData;

      console.log('Data fetched and cached successfully');
    } else {
      console.log('Not within the specified time range. Skipping data fetch.');
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

// Fetch data when the server starts
fetchDataAndCache();

// Set up an interval to fetch data every 30 minutes
setInterval(fetchDataAndCache, fetchInterval);

app.get('/GetMutualFundsData', (req, res) => {
  try {
    if (!cachedData) {
      return res.status(500).send('Data not available');
    }

    // Convert the cached data to JSON
    const jsonData = JSON.stringify(cachedData);

    res.setHeader('Content-Type', 'application/json');
    res.send(jsonData);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
