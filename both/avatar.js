Avatar.setOptions({
  // S6: dropped Gravatar lookup. We no longer compute or publish the MD5
  // emailHash, so there is nothing to send Gravatar. All users now fall
  // back to the local default image, which is fine for a job board.
  //
  // A9.30: switched the static default from a red person-silhouette PNG
  // to an indigo+amber SVG that matches the brand. SVG scales cleanly to
  // every imageSize without raster artefacts.
  fallbackType: "default image",
  defaultImageUrl: "/images/avatar.svg",
  imageSizes: {
    'small': 30,
    'medium': 100,
    'large': 200
  }
});
