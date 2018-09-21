import L from 'leaflet';
import 'leaflet-ajax';
import pointInPolygon from './point-in-polygon';
import colours from './colours';
import marker from './images/marker-icon.png'
import markerRetina from './images/marker-icon-2x.png'
import shadow from './images/marker-shadow.png'
import fs from 'fs';
import Papa from 'papaparse';
import parse from 'date-fns/parse';
import format from 'date-fns/format';

const csv = fs.readFileSync(__dirname + '/data/councillors.csv', 'utf8');

const output = Papa.parse(csv, {
  header: true
})

const geojson = require('./data/wards.geojson')

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

const PEARSON = [43.6777,-79.6248];
const HOME = [43.6405289,-79.42441129999997];
const WORK = [43.650308,-79.363612];
const OTT = [45.4215, -75.6972];
const NAVY = '#134c77';
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
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
    fillColor: getColor(feature.properties.AREA_L_CD),
    fillOpacity: 0.3,
    weight: 2,
    opacity: 1,
    color: NAVY,
  };
}

function on(eventName, wrapper, selector, fn) {
  wrapper.addEventListener(eventName, (evt) => {
    const possibleTargets = Array.prototype.slice.call(wrapper.querySelectorAll(selector));
    const target = evt.target;

    possibleTargets.forEach((possibleTarget) => {
      let el = target;
      while (el && el !== wrapper) {
        if (el === possibleTarget) {
          return fn.call(possibleTarget, evt, possibleTarget);
        }
        el = el.parentNode;
      }
      return el;
    });
  }, eventName === 'blur');
}

class InfoBox {
  constructor(title, array) {
    this.title = title;
    this.array = array;
    this.open = false;
    this.openIndex = null;
  }

  init() {
    this.div = document.createElement('div');
    this.div.className = 'info-box';
    document.body.appendChild(this.div)
    on('click', this.div, '.info-box-title', (event) => {
      this.open = !this.open;
      this.render();
    });

    on('click', this.div, '.candidate', (event, target) => {
      this.openIndex = parseInt(target.dataset['index'])
      this.render();
    });

    if (this.title) {
      this.render();
    }
  }

  update(title, array) {
    this.openIndex = null;
    this.title = title;
    this.array = array;
    this.render();
  }

  render() {
    this.div.classList.add('active');
    const info = this.open ? `<ul class='info-box-info'>${this.array.map((candidate, index) => {
      if (candidate['"name"']) {
        candidate.name = candidate['"name"'];
      }
      const date = `${format(parse(candidate.nomination_date), 'MMM Do')}`
      return `<li>
        <div data-index='${index}' class='candidate'>
          <p>${candidate.name}</p>
          <p class='nom-date'>${(parseInt(candidate.incumbent) === 1) ? '<strong>incumbent</strong>' : ''}</p>
        </div>
        <div class='candidate-info ${ this.openIndex === index ? 'active' : '' }'>
          <ul>
            <li><p>Nomination date</p><p>${date}</p></li>
            ${candidate.email && `<li><p>Email</p><p><a href='mailto:${candidate.email}'>${candidate.email}</a></p></li>` }
            ${candidate.website && `<li><p>Website</p><p><a href='http://${candidate.website}'>${candidate.website}</a></p></dd>` }
            ${candidate.phone && `<li><p>Phone</p><p>${candidate.phone}</p></li>` }
          </ul>
        </div>
      </li>`
  }).join(' ')}</ul>` : '';
    this.div.innerHTML = `<div class='info-box-inner'>
      <p class='info-box-title'><span>Ward ${this.title}</span><span class='candidate-count'>${this.array.length} candidates</span></p>
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
    //   this.dropPin(OTT);
    // }, 1000)
    navigator.geolocation.getCurrentPosition((position) => {
      this.dropPin([position.coords.latitude, position.coords.longitude]);
    }, (error) => {
      console.log(error);
    }, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });
  }

  showInfo() {
    const name = this.ward.feature.properties.AREA_NAME;
    const num = parseInt(this.ward.feature.properties.AREA_L_CD);
    this.infoBox.update(
      `${num}—${name}`,
      councillorsByWard[num] || []
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
    if (this.ward) {
      this.ward.layer.setStyle({
        weight: 3,
        fillOpacity: 0.7
      });
      this.showInfo();
    }
  }
}

const map = new Map();
map.init();
map.loadFeatures();
map.geoLocate()