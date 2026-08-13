# Keyword News Widget

A small embeddable headline widget hosted on GitHub Pages. A GitHub Action periodically reads RSS/Atom feeds, filters stories into keyword-based topics (including grouped AND/OR rules), writes a static JSON snapshot, and deploys the widget.

## 1. Configure topics and feeds

This version is preconfigured for **tax news tied to the 2028 U.S. presidential election**. A story must contain at least one tax term **and** at least one presidential-election term.

```json
{
  "topics": {
    "2028-presidential-tax": {
      "all": [
        ["tax", "tax policy", "tax plan", "tariff", "IRS"],
        ["2028 presidential", "2028 election", "presidential campaign", "White House race"]
      ]
    }
  }
}
```

Each nested array is an OR group; every group must match. This keeps generic tax stories and generic campaign stories out of the widget unless the story connects the two subjects.

The starter feeds use Google News RSS searches for broad coverage plus the U.S. Treasury feed. You can add or replace RSS/Atom feeds under `feeds`.

## 2. Test locally

```bash
npm install
npm run fetch
python3 -m http.server 8000 -d src
```

Open `http://localhost:8000`.

## 3. Publish with GitHub Pages

1. Create a GitHub repository and push these files to the `main` branch.
2. In **Settings → Pages**, choose **GitHub Actions** as the source.
3. Run **Actions → Update headlines → Run workflow** once.
4. Your site will be available at `https://USERNAME.github.io/REPOSITORY/`.

## 4. Embed on another site

```html
<div id="keyword-news"></div>
<script
  src="https://USERNAME.github.io/REPOSITORY/widget.js"
  data-target="keyword-news"
  data-topic="2028-presidential-tax"
  data-limit="8"
  data-title="2028 Presidential Election: Tax News">
</script>
```

Available attributes:

- `data-target`: ID of the element that receives the widget.
- `data-topic`: topic key from `config.json`.
- `data-limit`: number of headlines to show.
- `data-title`: visible widget heading.

## Notes

- The workflow currently runs hourly at minute 17. Change the cron expression if needed.
- RSS feed URLs change occasionally; replace any source that stops responding.
- Headline/source/link metadata is safer to redistribute than copied article text. Check each source's terms before displaying summaries or other content.
- GitHub Actions scheduled runs can be delayed during periods of high load; this is best for periodic updates, not second-by-second news.
