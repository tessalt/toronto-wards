import L from 'leaflet';
import 'leaflet.offline';
import json from './data/wards.json';
import offline from './offline';
import pointInPolygon from './point-in-polygon';
import colours from './colours';
import marker from './images/marker-icon.png'
import markerRetina from './images/marker-icon-2x.png'
import shadow from './images/marker-shadow.png'

import councillors from './data/councillors.json';

councillors.councillors.forEach((row) => {
})

const councillorsByWard = councillors.councillors.reduce((memo, row) => {
  const ward = row.ward.replace(' ', '');
  if (memo[ward]) {
    memo[ward] = memo[ward].concat([row]);
    return memo;
  } else {
    memo[ward] = [row];
    return memo;
  }
}, {})

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

class Map {
  constructor() {
    this.map = null;
    this.baseLayer = null;
    this.wards = [];
    this.marker = null;
  }

  init() {
    this.map = L.map('map');
    this.baseLayer = L.tileLayer.offline(TILE_URL, {
      attribution: ATTRIBUTION,
      minZoom: MINZOOM,
    }).addTo(this.map);
    this.map.setView(HOME, 3);
    this.infoBox = document.createElement('div');
    this.infoBox.className = 'info-box';
    document.body.appendChild(this.infoBox)
  }

  loadFeatures(data) {
    this.geojson = L.geoJSON(data, {
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
    setTimeout(() => {
      this.dropPin(WORK);
    }, 1000)
  }

  showInfo() {
    this.infoBox.classList.add('active');
    this.infoBox.innerHTML = `<div class='info-box-inner'>
      <p class='info-box-title'>You're in Ward ${this.ward.feature.properties.AREA_NAME}</p>
    </div>`;
    this.infoBox.addEventListener('click', (evt) => {
      this.infoBox.innerHTML = `<div class='info-box-inner'>
        <p class='info-box-title'>You're in Ward ${this.ward.feature.properties.AREA_NAME}</p>
        <div>${councillorsByWard[this.ward.feature.properties.AREA_NAME].map((candidate) => candidate.name)}</div>
      </div>`;
    })
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
map.loadFeatures(json);
map.geoLocate()