'use strict';

/**
 * Features static utility methods for GIS and planetary math
 */
var MathUtils = {};

MathUtils.maxLatRadians = 1.484422;
MathUtils.maxLatDegrees = 85.05113;

MathUtils.ONE_OVER_PI = 1.0/Math.PI;
MathUtils.ONE_OVER_180 = 1.0/180.0;
MathUtils.RAD_PER_DEG = Math.PI/180.0;
MathUtils.DEG_PER_RAD = 180.0/Math.PI;

MathUtils.EARTH_RADIUS = 6371000;
MathUtils.SOLAR_RADIUS = 695500000;
MathUtils.MOON_RADIUS = 1737400;

/**
 * Credits to Cesium WebMercatorProjection
 * https://github.com/AnalyticalGraphicsInc/cesium/blob/5660d848a102978b30d1d72409ea2cf50aafc206/Source/Core/WebMercatorProjection.js
 */
MathUtils.geodeticLatitudeToMercatorAngle = function (lat) {
  if (lat > MathUtils.maxLatRadians) {
    lat = MathUtils.maxLatRadians;
  } else if (lat < -MathUtils.maxLatRadians) {
    lat = -MathUtils.maxLatRadians;
  }

  var sinLatitude = Math.sin(lat);
  return 0.5*Math.log((1.0 + sinLatitude)/(1.0 - sinLatitude));
},

MathUtils.radToDeg = function (rad) {
  return rad*MathUtils.DEG_PER_RAD;
},

MathUtils.degToRad = function (deg) {
  return deg*MathUtils.RAD_PER_DEG;
};

MathUtils.polarToCartesian = function (phi, theta, r) {
  return new THREE.Vector3(
    r*Math.sin(theta)*Math.cos(phi),
    r*Math.sin(theta)*Math.sin(phi),
    r*Math.cos(theta)
  );
};

MathUtils.maxDefined = function () {
  var max = -Infinity;
  var defined = false;
  for(var i = 0; i < arguments.length; i++) {
    var arg = arguments[i];
    if (typeof arg === 'number' && arg > max) {
      max = arg;
      defined = true;
    }
  }

  if (defined) {
    return max;
  }
  return undefined;
};
