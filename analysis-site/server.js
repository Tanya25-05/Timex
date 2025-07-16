const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
require("dotenv").config();

// AI Analysis imports
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { ChromaClient } = require("chromadb");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Configure multer for file uploads
const upload = multer({ dest: "uploads/" });

// Initialize AI components
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Initialize ChromaDB client with error handling
let chromaClient = null;
let chromaAvailable = false;

async function initializeChromaDB() {
  try {
    chromaClient = new ChromaClient({
      path: "http://localhost:8000",
    });

    // Test the connection
    await chromaClient.heartbeat();
    chromaAvailable = true;
    console.log("✅ ChromaDB connected successfully!");

    // Ensure we have a collection
    try {
      await chromaClient.getCollection({
        name: "website_categories",
      });
    } catch (error) {
      // Collection doesn't exist, create it
      await chromaClient.createCollection({
        name: "website_categories",
        metadata: { description: "Website categorization data" },
      });
      console.log("✅ Created ChromaDB collection: website_categories");
    }
  } catch (error) {
    console.log("⚠️  ChromaDB not available:", error.message);
    console.log("   The app will work without vector database features");
    chromaAvailable = false;
  }
}

// Initialize ChromaDB on startup
initializeChromaDB();

// Website categorization system
class WebsiteCategorizer {
  constructor() {
    this.categories = [
      "Social Media",
      "Entertainment",
      "Work/Productivity",
      "Shopping/E-commerce",
      "News/Information",
      "Education/Learning",
      "Communication",
      "Gaming",
      "Health/Fitness",
      "Finance/Banking",
      "Travel",
      "Technology",
      "Other",
    ];

    this.categoryKeywords = {
      "Social Media": [
        "facebook",
        "twitter",
        "instagram",
        "linkedin",
        "tiktok",
        "snapchat",
        "reddit",
        "pinterest",
      ],
      Entertainment: [
        "youtube",
        "netflix",
        "spotify",
        "twitch",
        "hulu",
        "disney",
        "prime",
        "music",
      ],
      "Work/Productivity": [
        "gmail",
        "google docs",
        "slack",
        "zoom",
        "teams",
        "notion",
        "trello",
        "asana",
      ],
      "Shopping/E-commerce": [
        "amazon",
        "ebay",
        "etsy",
        "shopify",
        "walmart",
        "target",
        "best buy",
      ],
      "News/Information": [
        "cnn",
        "bbc",
        "reuters",
        "nytimes",
        "washington post",
        "google news",
      ],
      "Education/Learning": [
        "coursera",
        "udemy",
        "khan academy",
        "edx",
        "wikipedia",
        "stack overflow",
      ],
      Communication: [
        "whatsapp",
        "telegram",
        "discord",
        "skype",
        "viber",
        "signal",
      ],
      Gaming: [
        "steam",
        "roblox",
        "minecraft",
        "fortnite",
        "league of legends",
        "valorant",
      ],
      "Health/Fitness": [
        "myfitnesspal",
        "fitbit",
        "strava",
        "calm",
        "headspace",
        "webmd",
      ],
      "Finance/Banking": [
        "paypal",
        "venmo",
        "chase",
        "bank of america",
        "robinhood",
        "mint",
      ],
      Technology: [
        "github",
        "stackoverflow",
        "techcrunch",
        "wired",
        "ars technica",
      ],
      Travel: [
        "booking",
        "airbnb",
        "expedia",
        "kayak",
        "tripadvisor",
        "google maps",
      ],
    };
  }

  async categorizeWebsite(url, title) {
    try {
      // First try to categorize using keywords
      const keywordCategory = this.categorizeByKeywords(url, title);
      if (keywordCategory) {
        return keywordCategory;
      }

      // If no keyword match, use AI to categorize
      return await this.categorizeWithAI(url, title);
    } catch (error) {
      console.error("Error categorizing website:", error);
      return "Other";
    }
  }

  categorizeByKeywords(url, title) {
    const domain = new URL(url).hostname.toLowerCase();
    const searchText = `${domain} ${title.toLowerCase()}`;

    for (const [category, keywords] of Object.entries(this.categoryKeywords)) {
      if (keywords.some((keyword) => searchText.includes(keyword))) {
        return category;
      }
    }
    return null;
  }

  async categorizeWithAI(url, title) {
    const prompt = `
    Categorize this website into one of the following categories based on its URL and title:
    ${this.categories.join(", ")}

    URL: ${url}
    Title: ${title}

    Respond with only the category name, nothing else.
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const category = response.text().trim();

      // Validate the response is one of our categories
      if (this.categories.includes(category)) {
        return category;
      } else {
        return "Other";
      }
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      return "Other";
    }
  }
}

const categorizer = new WebsiteCategorizer();

// Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Import data from Chrome extension
app.post("/api/import-data", upload.single("data"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileContent = await fs.readFile(req.file.path, "utf8");
    const data = JSON.parse(fileContent);

    // Process and categorize the data
    const processedData = await processExtensionData(data);

    // Save processed data
    await fs.writeFile(
      "data/processed_data.json",
      JSON.stringify(processedData, null, 2)
    );

    // Clean up uploaded file
    await fs.unlink(req.file.path);

    res.json({
      success: true,
      message: "Data imported successfully",
      summary: {
        totalSites: processedData.sites.length,
        totalTime: processedData.totalTime,
        categories: processedData.categoryBreakdown,
      },
    });
  } catch (error) {
    console.error("Import error:", error);
    res.status(500).json({ error: "Failed to import data" });
  }
});

// Get analysis data
app.get("/api/analysis", async (req, res) => {
  try {
    const dataPath = "data/processed_data.json";
    const dataExists = await fs
      .access(dataPath)
      .then(() => true)
      .catch(() => false);

    if (!dataExists) {
      return res
        .status(404)
        .json({ error: "No data available. Please import data first." });
    }

    const data = JSON.parse(await fs.readFile(dataPath, "utf8"));
    const analysis = generateAnalysis(data);

    res.json(analysis);
  } catch (error) {
    console.error("Analysis error:", error);
    res.status(500).json({ error: "Failed to generate analysis" });
  }
});

// Enhanced AI-powered insights endpoint
app.get("/api/ai-insights", async (req, res) => {
  try {
    const dataPath = "data/processed_data.json";
    const dataExists = await fs
      .access(dataPath)
      .then(() => true)
      .catch(() => false);

    if (!dataExists) {
      return res
        .status(404)
        .json({ error: "No data available. Please import data first." });
    }

    const data = JSON.parse(await fs.readFile(dataPath, "utf8"));
    const insights = await generateAIInsights(data);

    res.json(insights);
  } catch (error) {
    console.error("AI Insights error:", error);
    res.status(500).json({ error: "Failed to generate AI insights" });
  }
});

// Enhanced AI-powered recommendations
app.get("/api/recommendations", async (req, res) => {
  try {
    const dataPath = "data/processed_data.json";
    const dataExists = await fs
      .access(dataPath)
      .then(() => true)
      .catch(() => false);

    if (!dataExists) {
      return res.status(404).json({ error: "No data available" });
    }

    const data = JSON.parse(await fs.readFile(dataPath, "utf8"));
    const recommendations = await generateAIRecommendations(data);

    res.json(recommendations);
  } catch (error) {
    console.error("Recommendations error:", error);
    res.status(500).json({ error: "Failed to generate recommendations" });
  }
});

// Helper functions
async function processExtensionData(data) {
  const sites = [];
  let totalTime = 0;

  // Process each tab's data
  for (const tab of data.tabs || []) {
    if (tab.url && tab.time > 0) {
      const category = await categorizer.categorizeWebsite(tab.url, tab.title);

      sites.push({
        url: tab.url,
        title: tab.title,
        time: tab.time,
        category: category,
        lastActive: tab.lastActive || Date.now(),
      });

      totalTime += tab.time;
    }
  }

  // Group by category
  const categoryBreakdown = {};
  sites.forEach((site) => {
    if (!categoryBreakdown[site.category]) {
      categoryBreakdown[site.category] = {
        totalTime: 0,
        sites: [],
        count: 0,
      };
    }
    categoryBreakdown[site.category].totalTime += site.time;
    categoryBreakdown[site.category].sites.push(site);
    categoryBreakdown[site.category].count++;
  });

  return {
    sites,
    totalTime,
    categoryBreakdown,
    processedAt: new Date().toISOString(),
  };
}

function generateAnalysis(data) {
  const { sites, totalTime, categoryBreakdown } = data;

  // Calculate statistics
  const totalHours = totalTime / 3600;
  const avgTimePerSite = totalTime / sites.length;

  // Top categories by time
  const topCategories = Object.entries(categoryBreakdown)
    .sort(([, a], [, b]) => b.totalTime - a.totalTime)
    .slice(0, 5);

  // Most time-consuming sites
  const topSites = sites.sort((a, b) => b.time - a.time).slice(0, 10);

  // Time distribution
  const timeDistribution = Object.entries(categoryBreakdown).map(
    ([category, data]) => ({
      category,
      time: data.totalTime,
      percentage: (data.totalTime / totalTime) * 100,
      count: data.count,
    })
  );

  return {
    summary: {
      totalTime,
      totalHours,
      totalSites: sites.length,
      avgTimePerSite,
      categories: Object.keys(categoryBreakdown).length,
    },
    topCategories,
    topSites,
    timeDistribution,
    categoryBreakdown,
  };
}

// AI-powered insights generation
async function generateAIInsights(data) {
  const { sites, totalTime, categoryBreakdown } = data;

  // Prepare data for AI analysis
  const analysisData = {
    totalTime: totalTime,
    totalHours: totalTime / 3600,
    totalSites: sites.length,
    categories: Object.keys(categoryBreakdown).length,
    categoryBreakdown: categoryBreakdown,
    topSites: sites.sort((a, b) => b.time - a.time).slice(0.5),
    timeDistribution: Object.entries(categoryBreakdown).map(
      ([category, data]) => ({
        category,
        time: data.totalTime,
        percentage: (data.totalTime / totalTime) * 100,
        count: data.count,
      })
    ),
  };

  const prompt = `
  Analyze this time tracking data and provide detailed insights about the user's digital behavior:

  DATA SUMMARY:
  - Total time tracked: ${analysisData.totalHours.toFixed(1)} hours
  - Total sites visited: ${analysisData.totalSites}
  - Categories: ${analysisData.categories}
  
  TIME DISTRIBUTION:
  ${analysisData.timeDistribution
    .map(
      (item) =>
        `- ${item.category}: ${(item.time / 3600).toFixed(
          1
        )}h (${item.percentage.toFixed(1)}%)`
    )
    .join("\n")}
  
  TOP SITES:
  ${analysisData.topSites
    .map((site) => `- ${site.title}: ${(site.time / 3600).toFixed(1)}h`)
    .join("\n")}

  Please provide:
  1. **Behavioral Patterns**: What patterns do you notice in their browsing habits?
  2. **Productivity Analysis**: How productive are their online activities?
  3. **Time Management**: What can be improved about their time management?
  4. **Digital Wellness**: Any concerns about digital wellness or screen time?
  5. **Specific Insights**: 3-5 specific, actionable insights about their behavior

  Format your response as JSON with this structure:
  {
    "behavioralPatterns": "description",
    "productivityScore": "score out of 10 with explanation",
    "timeManagement": "analysis",
    "digitalWellness": "concerns and suggestions",
    "specificInsights": [
      {"title": "Insight 1", "description": "description", "action": "actionable step"},
      {"title": "Insight 2", "description": "description", "action": "actionable step"},
      {"title": "Insight 3", "description": "description", "action": "actionable step"}
    ]
  }
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const insightsText = response.text().trim();

    // Try to parse JSON response
    try {
      const insights = JSON.parse(insightsText);
      return insights;
    } catch (parseError) {
      console.log("Failed to parse AI response as JSON, using fallback");
      return {
        behavioralPatterns:
          "AI analysis completed but response format was unexpected.",
        productivityScore: "Analysis available",
        timeManagement: "Review the data patterns above",
        digitalWellness: "Consider your overall screen time balance",
        specificInsights: [
          {
            title: "AI Analysis Complete",
            description: insightsText.substring(0, 200) + "...",
            action: "Review the detailed analysis above",
          },
        ],
      };
    }
  } catch (error) {
    console.error("Error calling Gemini API for insights:", error);
    return {
      behavioralPatterns: "Unable to generate AI insights at this time.",
      productivityScore: "Data available for manual review",
      timeManagement: "Check the time distribution charts above",
      digitalWellness: "Monitor your overall screen time",
      specificInsights: [
        {
          title: "Manual Review Recommended",
          description:
            "Please review your time tracking data manually for insights.",
          action: "Analyze the charts and data above",
        },
      ],
    };
  }
}

// AI-powered recommendations generation
async function generateAIRecommendations(data) {
  const { categoryBreakdown, totalTime, sites } = data;

  const prompt = `
  Based on this time tracking data, generate personalized productivity recommendations:

  DATA:
  - Total time: ${(totalTime / 3600).toFixed(1)} hours
  - Categories: ${Object.keys(categoryBreakdown).join(", ")}
  - Time distribution: ${Object.entries(categoryBreakdown)
    .map(
      ([cat, data]) =>
        `${cat}: ${((data.totalTime / totalTime) * 100).toFixed(1)}%`
    )
    .join(", ")}

  Generate 5-7 personalized recommendations in this JSON format:
  [
    {
      "type": "warning|info|tip|success",
      "title": "Recommendation title",
      "description": "Detailed explanation",
      "action": "Specific actionable step",
      "priority": "high|medium|low"
    }
  ]

  Focus on:
  - Productivity improvements
  - Time management strategies
  - Digital wellness
  - Work-life balance
  - Specific tools or techniques
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const recommendationsText = response.text().trim();

    try {
      const recommendations = JSON.parse(recommendationsText);
      return recommendations;
    } catch (parseError) {
      console.log("Failed to parse AI recommendations as JSON, using fallback");
      return generateFallbackRecommendations(data);
    }
  } catch (error) {
    console.error("Error calling Gemini API for recommendations:", error);
    return generateFallbackRecommendations(data);
  }
}

// Fallback recommendations (original logic)
function generateFallbackRecommendations(data) {
  const { categoryBreakdown, totalTime } = data;
  const recommendations = [];

  // Analyze time spent on different categories
  const socialMediaTime = categoryBreakdown["Social Media"]?.totalTime || 0;
  const workTime = categoryBreakdown["Work/Productivity"]?.totalTime || 0;
  const entertainmentTime = categoryBreakdown["Entertainment"]?.totalTime || 0;

  // Calculate percentages
  const socialMediaPercentage = (socialMediaTime / totalTime) * 100;
  const workPercentage = (workTime / totalTime) * 100;
  const entertainmentPercentage = (entertainmentTime / totalTime) * 100;

  // Generate recommendations based on patterns
  if (socialMediaPercentage > 30) {
    recommendations.push({
      type: "warning",
      title: "High Social Media Usage",
      description: `You're spending ${socialMediaPercentage.toFixed(
        1
      )}% of your time on social media. Consider setting time limits.`,
      action: "Set daily limits for social media apps",
      priority: "high",
    });
  }

  if (workPercentage < 20) {
    recommendations.push({
      type: "info",
      title: "Low Productivity Time",
      description: `Only ${workPercentage.toFixed(
        1
      )}% of your time is spent on work/productivity. Consider blocking distracting sites during work hours.`,
      action: "Use website blockers during work hours",
      priority: "high",
    });
  }

  if (entertainmentPercentage > 40) {
    recommendations.push({
      type: "warning",
      title: "High Entertainment Usage",
      description: `You're spending ${entertainmentPercentage.toFixed(
        1
      )}% of your time on entertainment. Balance this with productive activities.`,
      action: "Schedule specific entertainment time slots",
      priority: "medium",
    });
  }

  // Add general productivity tips
  recommendations.push({
    type: "tip",
    title: "Time Blocking",
    description:
      "Try time blocking to allocate specific time slots for different activities.",
    action: "Use calendar apps to schedule your day",
    priority: "medium",
  });

  recommendations.push({
    type: "success",
    title: "Track Your Progress",
    description:
      "Regular tracking helps identify patterns and improve productivity over time.",
    action: "Continue monitoring your time usage",
    priority: "low",
  });

  return recommendations;
}

// Create data directory if it doesn't exist
async function ensureDataDirectory() {
  try {
    await fs.access("data");
  } catch {
    await fs.mkdir("data");
  }
}

// Start server
ensureDataDirectory().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
