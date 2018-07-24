import L from 'leaflet';
import 'leaflet-ajax';
import pointInPolygon from './point-in-polygon';
import colours from './colours';
import marker from './images/marker-icon.png'
import markerRetina from './images/marker-icon-2x.png'
import shadow from './images/marker-shadow.png'
import fs from 'fs';
import Papa from 'papaparse';

const csv = fs.readFileSync(__dirname + '/data/councillors.csv', 'utf8');

const output = Papa.parse(csv, {
  header: true
})

const geojson = require('./data/wards.geojson')

console.log(output)

const councillorsByWard = output.data.reduce((memo, row) => {
  const ward = parseInt(row.ward)
  if (memo[ward]) {
    memo[ward] = memo[ward].concat([row]);
    return memo;
  } else {
    memo[ward] = [row];
    return memo;
  }
}, {})

console.log(councillorsByWard)

const PEARSON = [43.6777,-79.6248];
const HOME = [43.6405289,-79.42441129999997];
const WORK = [43.650308,-79.363612];
const NAVY = '#134c77';
const TILE_URL = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = 'Map data {attribution.OpenStreetMap}';
const MINZOOM = 11;
const LOCALZOOM = 13;
const TORONTO = [43.650308,-79.363612];

const icon = L.icon(Object.assign(L.Icon.Default.prototype.options, {
  iconUrl: marker,
  iconRetinaUrl: markerRetina,
  shadowUrl: shadow,
}));

const getColor = (wardString) => {
  const lastChar = wardString[wardString.length -1];
  return colours[parseInt(lastChar, 10)]
}

const featureStyle = (feature) => {
  return {
    fillColor: getColor(feature.properties.AREA_NAME),
    fillOpacity: 0.3,
    weight: 2,
    opacity: 1,
    color: NAVY,
  };
}

class InfoBox {
  constructor(title, array) {
    this.title = title;
    this.array = array;
    this.open = false;
  }

  init() {
    this.div = document.createElement('div');
    this.div.className = 'info-box';
    document.body.appendChild(this.div)
    this.div.addEventListener('click', (evt) => {
      this.open = !this.open;
      this.render();
    });
    if (this.title) {
      this.render();
    }
  }

  update(title, array) {
    this.title = title;
    this.array = array;
    this.render();
  }

  render() {
    this.div.classList.add('active');
    const info = this.open ? `<ul class='info-box-info'>${this.array.map((candidate) => `<li>${candidate.name}</li>`).join(' ')}</ul>` : '';
    this.div.innerHTML = `<div class='info-box-inner'>
      <p class='info-box-title'>You're in Ward ${this.title}</p>
      ${info}
    </div>`;
  }
}

class Map {
  constructor() {
    this.map = null;
    this.baseLayer = null;
    this.wards = [];
    this.marker = null;
    this.info = [];
    this.infoShown = false;
  }

  init() {
    this.map = L.map('map');
    this.baseLayer = L.tileLayer(TILE_URL, {
      attribution: ATTRIBUTION,
      minZoom: MINZOOM,
    }).addTo(this.map);
    this.map.setView(HOME, 3);
    this.infoBox = new InfoBox(null, null);
    this.infoBox.init();
  }

  loadFeatures() {
    this.geojson = L.geoJSON.ajax(geojson, {
      style: featureStyle,
      onEachFeature: (feature, layer) => {
        this.wards.push({feature, layer});
        layer.on({
          click: (e) => {
            this.selectFeature(e);
          }
        })
      }
    }).addTo(this.map);
  }

  selectFeature(e) {
    this.map.fitBounds(e.target.getBounds());
    this.dropPin([e.latlng.lat, e.latlng.lng])
  }

  geoLocate() {
    // setTimeout(() => {
    //   this.dropPin(WORK);
    // }, 1000)
    navigator.geolocation.getCurrentPosition((position) => {
      this.dropPin([position.coords.latitude, position.coords.longitude]);
    });
  }

  showInfo() {
    const name = parseInt(this.ward.feature.properties.AREA_NAME)
    this.infoBox.update(
      name,
      councillorsByWard[name] || []
    );
  }

  dropPin(latlng) {
    if (this.marker) {
     this.marker.setLatLng(latlng);
    } else {
      this.marker = L.marker(latlng, { icon }).addTo(this.map)
    }
    this.map.flyTo(latlng, 13);
    if (this.ward) {
      this.ward.layer.setStyle({
        fillOpacity: 0.3,
        weight: 2,
      })
    }
    this.ward = this.wards.find((feature) => {
      return pointInPolygon(latlng, feature.feature.geometry.coordinates[0])
    });
    this.ward.layer.setStyle({
      weight: 3,
      fillOpacity: 0.7
    });
    this.showInfo();
  }
}

const map = new Map();
map.init();
map.loadFeatures();
map.geoLocate()