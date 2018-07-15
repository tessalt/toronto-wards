import L from 'leaflet';
import 'leaflet.offline';
import GeoJsonGeometriesLookup from 'geojson-geometries-lookup';
import data from './data/wards.json';
import offline from './offline';
import pointInPolygon from './point-in-polygon';
import colours, { navy } from './colours';
import marker from './images/marker-icon.png'
import markerRetina from './images/marker-icon-2x.png'
import shadow from './images/marker-shadow.png'


var icon = L.icon(Object.assign(L.Icon.Default.prototype.options, {
  iconUrl: marker,
  iconRetinaUrl: markerRetina,
  shadowUrl: shadow,
}));

const PEARSON = [43.6777,-79.6248];
const HOME = [43.6405289,-79.42441129999997];
const WORK = [43.650308,-79.363612];

const map = L.map('map');

const baseLayer = L.tileLayer.offline('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: 'Map data {attribution.OpenStreetMap}',
  minZoom: 11,
}).addTo(map);

// offline(map, baseLayer);

let geojson;
const features = [];

// const getColor = (wardString) => {
//   const lastChar = wardString[wardString.length -1];
//   return colours[parseInt(lastChar, 10)]
// }

// function resetHighlight(e) {
//   geojson.resetStyle(e.target);
// }

// function style(feature) {
//   return {
//     fillColor: getColor(feature.properties.AREA_NAME),
//     fillOpacity: 0.3,
//     weight: 2,
//     opacity: 1,
//     color: '#134c77',
//   };
// }

// function highlightFeature(e) {
//   var layer = e.target;

//   layer.setStyle({
//     weight: 3,
//     dashArray: '',
//     fillOpacity: 0.7
//   });

//   if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
//       layer.bringToFront();
//   }
// }

map.setView(HOME, 3);
// geojson = L.geoJSON(data, {
//   style,
//   onEachFeature: (feature, layer) => {
//     features.push({
//       feature,
//       layer
//     });
//     layer.on({
//       mouseover: highlightFeature,
//       mouseout: resetHighlight,
//       click: (e) => {
//         map.fitBounds(e.target.getBounds());
//       }
//     })
//   }
// }).addTo(map)


const selectPoint = (point) => {
  map.flyTo(point, 13);
  L.marker(point, {icon}).addTo(map)
  const ward = features.find((feature) => {
    return pointInPolygon(point, feature.feature.geometry.coordinates[0])
  });
  ward.layer.setStyle({
    weight: 3,
    dashArray: '',
    fillOpacity: 0.7
  });
}

setTimeout(() => {
  selectPoint(HOME)
}, 1000)
