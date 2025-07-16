# Time Analysis Dashboard

An AI-powered web application that analyzes your Chrome extension time tracking data to provide insights into your browsing habits and productivity optimization recommendations.

## Features

- **Data Import**: Upload exported data from your Chrome extension
- **AI Categorization**: Automatically categorizes websites using AI and RAG (Retrieval-Augmented Generation)
- **Visual Analytics**: Interactive charts showing time distribution by category and top sites
- **Smart Recommendations**: AI-generated personalized recommendations for time optimization
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- OpenAI API key (for AI categorization)

## Installation

1. **Clone or download the analysis site files**

   ```bash
   cd analysis-site
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp env.example .env
   ```

   Edit `.env` and add your OpenAI API key:

   ```
   OPENAI_API_KEY=your_actual_openai_api_key_here
   PORT=3000
   ```

4. **Start the server**

   ```bash
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## Usage

### Step 1: Export Data from Chrome Extension

1. Open your Chrome extension popup
2. Click the "Export Data" button
3. Save the JSON file to your computer

### Step 2: Upload and Analyze

1. Open the Time Analysis Dashboard in your browser
2. Drag and drop the exported JSON file or click "Choose File"
3. Wait for the AI to process and categorize your data
4. Explore your personalized insights and recommendations

## How It Works

### AI Categorization System

The application uses a hybrid approach for website categorization:

1. **Keyword Matching**: First attempts to categorize sites using predefined keyword patterns
2. **AI Analysis**: Uses OpenAI's language model to categorize unfamiliar sites
3. **RAG Implementation**: Leverages LangChain for enhanced categorization accuracy

### Categories

Websites are automatically categorized into:

- Social Media (Facebook, Twitter, Instagram, etc.)
- Entertainment (YouTube, Netflix, Spotify, etc.)
- Work/Productivity (Gmail, Google Docs, Slack, etc.)
- Shopping/E-commerce (Amazon, eBay, etc.)
- News/Information (CNN, BBC, etc.)
- Education/Learning (Coursera, Wikipedia, etc.)
- Communication (WhatsApp, Telegram, etc.)
- Gaming (Steam, Roblox, etc.)
- Health/Fitness (MyFitnessPal, Fitbit, etc.)
- Finance/Banking (PayPal, banking sites, etc.)
- Technology (GitHub, Stack Overflow, etc.)
- Travel (Booking.com, Airbnb, etc.)
- Other (uncategorized sites)

### Analysis Features

- **Time Distribution**: Visual breakdown of time spent by category
- **Top Sites**: Most time-consuming websites
- **Productivity Insights**: Work vs. entertainment time analysis
- **Personalized Recommendations**: AI-generated tips for time optimization

## API Endpoints

- `POST /api/import-data` - Upload and process extension data
- `GET /api/analysis` - Get processed analysis data
- `GET /api/recommendations` - Get AI-generated recommendations

## Customization

### Adding New Categories

Edit the `categoryKeywords` object in `server.js`:

```javascript
this.categoryKeywords = {
  "New Category": ["keyword1", "keyword2", "keyword3"],
  // ... existing categories
};
```

### Modifying AI Prompts

Update the categorization prompt in the `categorizeWithAI` method:

```javascript
const prompt = `
    Your custom prompt here...
    Categories: ${this.categories.join(", ")}
    URL: ${url}
    Title: ${title}
`;
```

### Styling

Modify `public/styles.css` to customize the appearance:

```css
:root {
  --primary-color: #667eea;
  --secondary-color: #764ba2;
  /* Add your custom colors */
}
```

## Troubleshooting

### Common Issues

1. **"No data available" error**

   - Ensure you've exported data from the Chrome extension
   - Check that the JSON file is valid

2. **AI categorization not working**

   - Verify your OpenAI API key is correct
   - Check your API usage limits

3. **Charts not displaying**
   - Ensure Chart.js is loading properly
   - Check browser console for JavaScript errors

### Debug Mode

Enable debug logging by setting:

```javascript
// In server.js
const DEBUG = true;
```

## Security Considerations

- API keys are stored in environment variables
- File uploads are validated and sanitized
- No sensitive data is stored permanently (unless configured)

## Performance

- Large datasets are processed efficiently
- Charts are optimized for smooth rendering
- AI categorization is cached to reduce API calls

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:

1. Check the troubleshooting section
2. Review the browser console for errors
3. Ensure all dependencies are installed correctly

## Future Enhancements

- Historical trend analysis
- Goal setting and tracking
- Integration with productivity tools
- Mobile app version
- Team analytics features
