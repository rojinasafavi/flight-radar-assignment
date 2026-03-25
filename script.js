/**
 * Finland Flight Radar Core Logic
 */

// --- Configuration ---
// Finland Bounding Box
const LAMIN = 59.5;
const LOMIN = 19.1;
const LAMAX = 70.1;
const LOMAX = 31.6;

// Center of Finland
const CENTER_LAT = 64.9146659;
const CENTER_LNG = 26.0672554;
const DEFAULT_ZOOM = 6;

const API_URL = `https://opensky-network.org/api/states/all?lamin=${LAMIN}&lomin=${LOMIN}&lamax=${LAMAX}&lomax=${LOMAX}`;
const POLL_INTERVAL_MS = 10000; // 10 seconds

// Base SVG plane icon
const PLANE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="airplane-svg" width="24" height="24">
  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
</svg>
`;

// --- State ---
let map;
let markers = {}; // stores string icao24 -> Leaflet marker instance
let selectedIcao24 = null;
let updateInterval;
let lastUpdateTime = Date.now();

// UI Elements
const uiElements = {
    updateTimer: document.getElementById('update-timer'),
    detailsPanel: document.getElementById('flight-details'),
    closeBtn: document.getElementById('close-details'),
    loadingOverlay: document.getElementById('global-loading'),
    
    // Details Data
    fdCallsign: document.getElementById('fd-callsign'),
    fdOrigin: document.getElementById('fd-origin'),
    fdAltitude: document.getElementById('fd-altitude'),
    fdVelocity: document.getElementById('fd-velocity'),
    fdHeading: document.getElementById('fd-heading'),
    fdVrate: document.getElementById('fd-vrate')
};

// --- Initialization ---
function init() {
    initMap();
    setupEventListeners();
    fetchFlightData();
    
    // Start polling
    updateInterval = setInterval(fetchFlightData, POLL_INTERVAL_MS);
    
    // Update timer text every second
    setInterval(updateTimerDisplay, 1000);
}

function initMap() {
    // Initialize map
    map = L.map('map', {
        zoomControl: false // We'll add it in the bottom right
    }).setView([CENTER_LAT, CENTER_LNG], DEFAULT_ZOOM);

    // Add Zoom Control to bottom right
    L.control.zoom({
        position: 'bottomright'
    }).addTo(map);

    // Add Dark Matter Tile Layer from Carto
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);
}

function setupEventListeners() {
    uiElements.closeBtn.addEventListener('click', closeDetailsPanel);
    
    // Map click outside markers should close details
    map.on('click', () => {
        closeDetailsPanel();
    });
}

// --- Data Fetching & Processing ---
async function fetchFlightData() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }
        
        const data = await response.json();
        lastUpdateTime = Date.now();
        
        uiElements.loadingOverlay.classList.add('hidden');
        
        processFlights(data.states || []);
    } catch (error) {
        console.error('Error fetching flight data:', error);
        uiElements.updateTimer.textContent = 'Connection Error';
        uiElements.updateTimer.style.color = '#ff4d4d'; // Red text for error
    }
}

function processFlights(states) {
    const currentIcaos = new Set();

    states.forEach(state => {
        // state vector indices: 
        // 0: icao24, 1: callsign, 2: origin_country, 3: time_position, 4: last_contact,
        // 5: longitude, 6: latitude, 7: baro_altitude, 8: on_ground, 9: velocity,
        // 10: true_track, 11: vertical_rate, 13: geo_altitude
        
        const [
            icao24, callsignRaw, origin_country, , ,
            lng, lat, baro_altitude, on_ground, velocity,
            true_track, vertical_rate
        ] = state;

        if (lat === null || lng === null) return; // ignore invalid positions
        
        const callsign = (callsignRaw || '').trim() || 'UNKNOWN';
        currentIcaos.add(icao24);

        const flightData = {
            icao24,
            callsign,
            origin: origin_country,
            lat,
            lng,
            altitude: baro_altitude !== null ? baro_altitude : 0,
            velocity: velocity !== null ? velocity * 3.6 : 0, // Convert m/s to km/h
            heading: true_track !== null ? true_track : 0,
            vertical_rate: vertical_rate !== null ? vertical_rate : 0
        };

        if (markers[icao24]) {
            // Update existing marker
            updateMarker(icao24, flightData);
        } else {
            // Create new marker
            createMarker(flightData);
        }
        
        // If this marker is currently selected, update the sidebar
        if (selectedIcao24 === icao24) {
            updateDetailsPanel(flightData);
        }
    });

    // Remove planes that are no longer in the bounding box / data
    Object.keys(markers).forEach(icao24 => {
        if (!currentIcaos.has(icao24)) {
            map.removeLayer(markers[icao24]);
            delete markers[icao24];
            
            if (selectedIcao24 === icao24) {
                closeDetailsPanel();
            }
        }
    });
}

// --- Marker Management ---
function createMarker(data) {
    // We use a DivIcon with custom SVG to allow CSS rotations and styling easily
    const icon = L.divIcon({
        className: `airplane-icon ${selectedIcao24 === data.icao24 ? 'selected' : ''}`,
        html: `<div style="transform: rotate(${data.heading}deg); transform-origin: center;">${PLANE_SVG}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    const marker = L.marker([data.lat, data.lng], { icon, title: data.callsign })
        .addTo(map)
        .on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            selectFlight(data);
        });

    markers[data.icao24] = marker;
}

function updateMarker(icao24, data) {
    const marker = markers[icao24];
    
    // Animate position natively via Leaflet (could use plugins for smoother inter-frame animation, 
    // but updating coordinates is enough for 10s intervals)
    marker.setLatLng([data.lat, data.lng]);
    
    // Update rotation and class state
    const isSelected = selectedIcao24 === data.icao24;
    const newIcon = L.divIcon({
        className: `airplane-icon ${isSelected ? 'selected' : ''}`,
        html: `<div style="transform: rotate(${data.heading}deg); transform-origin: center; transition: transform 1s ease;">${PLANE_SVG}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
    marker.setIcon(newIcon);
    
    // Update marker data locally so click handlers get fresh data
    marker.off('click');
    marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        selectFlight(data);
    });
}

// --- UI Updates ---
function selectFlight(data) {
    // Unselect previous
    if (selectedIcao24 && markers[selectedIcao24]) {
        const oldMarker = markers[selectedIcao24];
        const el = oldMarker.getElement();
        if (el) el.classList.remove('selected');
    }
    
    selectedIcao24 = data.icao24;
    
    // Select new
    if (markers[selectedIcao24]) {
        const el = markers[selectedIcao24].getElement();
        if (el) el.classList.add('selected');
        
        // Pan to selected marker if it's too far from center
        map.panTo([data.lat, data.lng]);
    }
    
    updateDetailsPanel(data);
    uiElements.detailsPanel.classList.remove('hidden');
}

function closeDetailsPanel() {
    if (selectedIcao24 && markers[selectedIcao24]) {
        const el = markers[selectedIcao24].getElement();
        if (el) el.classList.remove('selected');
    }
    
    selectedIcao24 = null;
    uiElements.detailsPanel.classList.add('hidden');
}

function updateDetailsPanel(data) {
    uiElements.fdCallsign.textContent = data.callsign;
    uiElements.fdOrigin.textContent = data.origin;
    uiElements.fdAltitude.textContent = `${Math.round(data.altitude).toLocaleString()} m`;
    uiElements.fdVelocity.textContent = `${Math.round(data.velocity).toLocaleString()} km/h`;
    uiElements.fdHeading.textContent = `${Math.round(data.heading)}°`;
    
    const vRateText = data.vertical_rate > 0 ? `+${data.vertical_rate.toFixed(1)} m/s` : `${data.vertical_rate.toFixed(1)} m/s`;
    uiElements.fdVrate.textContent = vRateText;
    
    if (data.vertical_rate > 0) {
        uiElements.fdVrate.style.color = '#00ff88'; // green climbing
    } else if (data.vertical_rate < 0) {
        uiElements.fdVrate.style.color = '#ff8800'; // orange descending
    } else {
        uiElements.fdVrate.style.color = 'var(--text-primary)';
    }
}

function updateTimerDisplay() {
    const now = Date.now();
    const elapsed = Math.floor((now - lastUpdateTime) / 1000);
    const remaining = Math.max(0, (POLL_INTERVAL_MS / 1000) - elapsed);
    
    uiElements.updateTimer.textContent = `Live • Next update: ${remaining}s`;
    uiElements.updateTimer.style.color = 'var(--text-secondary)';
}

// Start app
document.addEventListener('DOMContentLoaded', init);
