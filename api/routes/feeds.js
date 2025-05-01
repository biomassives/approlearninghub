// File: /api/routes/feeds.js

const express = require('express');
const router = express.Router();
const { createError } = require('../utils/error');


let Parser;

try {
  // Try to load the rss-parser module
  Parser = require('rss-parser');
} catch (error) {
  console.error('RSS Parser module not found:', error.message);
  //  Don't throw the error here.  Handle it in the route handler,
  //  so the server can start even if the parser is not available.
}

// Feed sources
const FEED_SOURCES = [
  {
    id: 'appro-blog',
    title: 'ApproVideo Blog',
    url: 'https://hub.approvideo.org/blog/rss.xml',
    type: 'rss'
  },
  {
    id: 'video-news',
    title: 'Video Production News',
    url: 'https://hub.approvideo.org/news/rss.xml',
    type: 'rss'
  }
];

/**
 * Get feeds from multiple sources
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const getFeeds = async (req, res, next) => {
  try {
    // Check if RSS parser is available
    if (!Parser) {
      return res.status(500).json({ // send 500
        error: true,
        message: 'RSS parser module not installed.  Please run: npm install rss-parser',
        feeds: FEED_SOURCES.map(source => ({
          ...source,
          items: [],
          status: 'error',
          error: 'RSS parser not available'
        }))
      });
    }

    // Create parser instance
    const parser = new Parser();

    // Fetch feeds
    const feedPromises = FEED_SOURCES.map(async (source) => {
      try {
        // Fetch and parse feed
        const feed = await parser.parseURL(source.url);

        // Format items
        const items = feed.items.map(item => ({
          id: item.guid || item.id || item.link,
          title: item.title,
          content: item.content || item.contentSnippet,
          link: item.link,
          author: item.creator || item.author,
          date: item.pubDate || item.isoDate,
          categories: item.categories || []
        }));

        return {
          ...source,
          title: feed.title || source.title,
          description: feed.description,
          link: feed.link,
          items,
          status: 'success'
        };
      } catch (error) {
        console.error(`Error fetching feed ${source.id}:`, error);
        //  Wrap the error using createError
        return {
          ...source,
          items: [],
          status: 'error',
          error: error.message
        };
      }
    });

    // Wait for all feeds to be fetched
    const feeds = await Promise.all(feedPromises);

    res.json({ feeds });
  } catch (error) {
    next(error); //  Pass to the error handler
  }
};

//  Define the route handler
router.get('/', getFeeds);

// Export the router
module.exports = router;
