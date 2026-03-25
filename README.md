# ✈️ Finland Flight Radar

![Flight Radar UI Showcase](https://images.unsplash.com/photo-1544256718-3bcf237f3974?auto=format&fit=crop&q=80&w=1000)

> *A sleek, modern, web-based flight tracking application specifically focused on Finland's airspace.*

## 📚 Project Overview
This project is a real-time flight radar application built using vanilla HTML, CSS, and JavaScript. It utilizes the [OpenSky Network API](https://opensky-network.org/) to fetch live flight data bounded specifically to Finland's geographical coordinates.

The map visualization is powered by [Leaflet.js](https://leafletjs.com/), customized with a beautiful Dark Matter base map. The dashboard uses modern glassmorphic overlays to create an immersive, premium user experience.

## ✨ Features
* **🇫🇮 Dedicated Bounding Box:** Maps explicitly only the flights occurring over Finland.
* **📍 Live Airspace Tracking:** Watch airplanes magically move in real-time across the dark-themed map.
* **🔍 Granular Flight Details:** Click on any airplane to access a smooth sidebar revealing:
  * Origin Country
  * Altitude (in meters)
  * Velocity (in km/h)
  * True Track (Aircraft direction)
  * Vertical Rate (Climbing/Descending indicators)
* **🔄 Auto-Polling:** Data automatically refreshes every 10 seconds. You never need to reload the page!
* **🎨 Glassmorphism Design:** A modern, clean, dark-themed UI paired with vibrant green accents and frosted glass effects.

## 🛠️ Technologies Used
* **Frontend Core:** Vanilla HTML5, CSS3, JavaScript (ES6+).
* **Map Engine:** Leaflet.js
* **Map Tiles:** CartoDB (Dark Matter Theme)
* **Data Source:** OpenSky Network REST API
* **Typography:** Google Fonts (Outfit)

## 🚀 Getting Started

Since this is a pure vanilla front-end application without complex build tools, serving it locally is incredibly simple.

### Quick Start
You just need a local HTTP server to run the application (in order to avoid CORS issues). 

**Option 1: Using Python (Recommended)**
If you have Python installed on your machine, open your terminal in the project folder and run:
```bash
python -m http.server 8080
```
Then visit [http://localhost:8080](http://localhost:8080) in your browser.

**Option 2: Using Node (npx)**
If you prefer the JS ecosystem, run:
```bash
npx serve .
```

---
*Note: To replace the cover photo at the top of this README with an actual screenshot of your app, simply take a screenshot, save it as `screenshot.png` in this directory, and update the top image link to `![Screenshot](screenshot.png)`.*
