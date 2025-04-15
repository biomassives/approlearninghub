// api/public/index.js
// Unified handler router for public-facing content: timeline, homepage data, featured videos, etc.

const handleTimelineData = require("./handlers/handleTimelineData");
const handleFeatured = require("./handlers/handleFeatured");
const handleHomePageData = require("./handlers/handleHomePageData");
const handleVideos = require("./handlers/handleVideos");
const handlePanels = require("./handlers/handlePanels");
const handleModules = require("./handlers/handleModules");
const handleClinics = require("./handlers/handleClinics");
const handleSearch = require("./handlers/handleSearch");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  if (req.method === "OPTIONS") return res.status(200).end();

  const url = new URL(req.url, `http://${req.headers.host}`);
  const type = url.pathname.split("/public/")[1] || url.searchParams.get("op") || "home";

  try {
    switch (type) {
      case "timeline-data":
        return handleTimelineData(req, res);

      case "videos":
        return handleVideos(req, res);

      case "panels":
        return handlePanels(req, res);

      case "modules":
        return handleModules(req, res);

      case "clinics":
        return handleClinics(req, res);

      case "featured":
        return handleFeatured(req, res);

      case "search":
        return handleSearch(req, res);

      case "home":
      default:
        return handleHomePageData(req, res);
    }
  } catch (error) {
    console.error(`Error in public/${type}:`, error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV !== "production" ? error.message : "Unknown error"
    });
  }
};
