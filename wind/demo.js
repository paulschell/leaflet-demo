function initDemoMap() {
  var Esri_WorldImagery = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      attribution:
        "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, " +
        "AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
    }
  );

  var Esri_DarkGreyCanvas = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    {
      maxZoom: 16,
      attribution:
        "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, " +
        "NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community"
    }
  );

  var baseLayers = {
    Satellite: Esri_WorldImagery,
    "Grey Canvas": Esri_DarkGreyCanvas
  };

  var map = L.map("map", {
    layers: [Esri_WorldImagery]
  });

  var layerControl = L.control.layers(baseLayers);
  layerControl.addTo(map);
  map.setView([-22, 150], 5);

  return {
    map: map,
    layerControl: layerControl
  };
}

// demo map
var mapStuff = initDemoMap();
var map = mapStuff.map;
var layerControl = mapStuff.layerControl;

// load JSON and pass it to callback
function getJSON(url, callback) {
  fetch(url)
    .then(function(res) {
      if (!res.ok) throw new Error("HTTP " + res.status + " for " + url);
      return res.json();
    })
    .then(callback)
    .catch(function(err) {
      console.error("Failed to load " + url + ":", err);
    });
}

// load data (u, v grids) from somewhere (e.g. https://github.com/danwild/wind-js-server)
getJSON("wind-gbr.json", function(data) {
  var velocityLayer = L.velocityLayer({
    displayValues: true,
    displayOptions: {
      velocityType: "GBR Wind",
      position: "bottomleft",
      emptyString: "No wind data",
      showCardinal: true
    },
    data: data,
    maxVelocity: 10
  });

  layerControl.addOverlay(velocityLayer, "Wind - Great Barrier Reef");
});

getJSON("water-gbr.json", function(data) {
  var velocityLayer = L.velocityLayer({
    displayValues: true,
    displayOptions: {
      velocityType: "GBR Water",
      position: "bottomleft",
      emptyString: "No water data"
    },
    data: data,
    maxVelocity: 0.6,
    velocityScale: 0.1 // arbitrary default 0.005
  });

  layerControl.addOverlay(velocityLayer, "Ocean Current - Great Barrier Reef");
});

getJSON("wind-global.json", function(data) {
  var velocityLayer = L.velocityLayer({
    displayValues: true,
    displayOptions: {
      velocityType: "Global Wind",
      position: "bottomleft",
      emptyString: "No wind data"
    },
    data: data,
    maxVelocity: 15
  });

  layerControl.addOverlay(velocityLayer, "Wind - Global");
});
