(function () {
  "use strict";

  if (new URLSearchParams(location.search).get("launch") === "1") return;

  var assets = [
    "./design/box.webp",
    "./design/team-collage.webp",
    "./assets/recruit-banner-blue.webp",
    "./design/joy.webp",
    "./design/end.webp",
    "./design/video-closed.webp",
    "./characters/dongdong-clean.webp",
    "./characters/gongning-farewell.webp",
    "./characters/lingxi.webp",
    "./characters/qiegao.webp",
    "./characters/sisi-clean.webp",
    "./characters/xiaoyao-pink-flamingo.webp",
    "./caseboard/summer-cool.webp",
    "./caseboard/qixi-love-birds.webp",
    "./caseboard/football-babies.webp",
    "./caseboard/football-10000.webp",
    "./caseboard/dont-watch-team.webp",
    "./caseboard/palm-world.webp",
    "./caseboard/steady-happiness.webp",
    "./caseboard/dad-tryon.webp",
    "./caseboard/museum-day.webp",
    "./caseboard/ouyang-nana-ai.webp",
    "./caseboard/pan-tao-hui.webp",
    "./caseboard/ai-tryon.webp",
    "./caseboard/ai-launch.webp",
    "./joy/xiaoyao-2years.webp",
    "./joy/team-building-2026.webp"
  ];

  function warmContent() {
    window.__boxWarmImages = assets.map(function (src) {
      var image = new Image();
      image.fetchPriority = "low";
      image.decoding = "async";
      image.src = src;
      return image;
    });
  }

  window.addEventListener("load", function () {
    window.setTimeout(warmContent, 80);
  }, { once: true });
})();
