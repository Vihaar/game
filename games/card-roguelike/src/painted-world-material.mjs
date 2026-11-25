import { Color } from "three";

// These pigment, ink and shade layers belong to individual room objects. They
// retain the original texture, alpha silhouette, lighting and 3D depth. Nothing
// samples the rendered scene or changes the camera, geometry or source artwork.
export function paintWorldMaterial(
  material,
  { illustration = false, progress = 0, seed = 0 } = {},
) {
  if (material.userData.paintedWorld) return material;
  material.userData.paintedWorld = { illustration, progress, seed };
  if (material.isMeshStandardMaterial) {
    material.flatShading = false;
    material.roughness = 1;
  }
  const previous = material.onBeforeCompile;
  const previousKey = material.customProgramCacheKey.bind(material);
  const cacheKey = previousKey();
  material.customProgramCacheKey = () =>
    `${cacheKey}|painted-world-v1|${illustration ? "ink" : "shade"}`;
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    shader.uniforms.worldPigmentSeed = { value: seed };
    shader.uniforms.worldPigmentInk = {
      value: new Color("#594332").lerp(new Color("#393147"), progress),
    };
    shader.uniforms.worldPigmentAmount = { value: illustration ? 0.64 : 0.4 };
    shader.fragmentShader =
      `
      uniform float worldPigmentSeed;
      uniform float worldPigmentAmount;
      uniform vec3 worldPigmentInk;
      float worldPaintWash(vec2 p) {
        return sin(p.x * 16.0 + sin(p.y * 11.0 + worldPigmentSeed) * .8)
          * sin(p.y * 21.0 + worldPigmentSeed * 1.7);
      }
    ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
      #ifdef USE_MAP
        vec2 paintUv = vMapUv;
        vec2 paintDx = dFdx(paintUv), paintDy = dFdy(paintUv);
        float paintWidth = 1.13 + .12 * sin(paintUv.y * 95.0 + worldPigmentSeed);
        vec4 paintCenter = texture2D(map, paintUv);
        vec4 paintA = texture2D(map, paintUv + paintDx * paintWidth);
        vec4 paintB = texture2D(map, paintUv - paintDx * paintWidth);
        vec4 paintC = texture2D(map, paintUv + paintDy * paintWidth);
        vec4 paintD = texture2D(map, paintUv - paintDy * paintWidth);
        float paintWeight = max(.001, paintCenter.a * 2.0 + paintA.a + paintB.a + paintC.a + paintD.a);
        vec3 paintSoft = (paintCenter.rgb * paintCenter.a * 2.0 + paintA.rgb * paintA.a
          + paintB.rgb * paintB.a + paintC.rgb * paintC.a + paintD.rgb * paintD.a) / paintWeight;
        vec3 paintBase = mix(paintCenter.rgb, paintSoft, worldPigmentAmount);
        float paintLuma = dot(paintBase, vec3(.2126,.7152,.0722));
        paintBase = mix(vec3(paintLuma), paintBase, 1.10);
        vec3 paintPalette = floor(max(vec3(0.0), paintBase) * 18.0 + .5) / 18.0;
        paintBase = mix(paintBase, paintPalette, .3);
        float paintShadow = 1.0 - smoothstep(.16,.72,paintLuma);
        paintBase *= mix(vec3(1.0),vec3(.91,.88,.97),paintShadow*.24);
        paintBase += vec3(.014,.007,-.004) * smoothstep(.60,.95,paintLuma);
        float paintWash = worldPaintWash(paintUv * 1.6) * .018;
        paintBase *= vec3(1.0 + paintWash, 1.0 + paintWash * .65, 1.0 - paintWash * .35);
        vec3 paintTint = diffuseColor.rgb / max(paintCenter.rgb,vec3(.001));
        diffuseColor.rgb = paintTint * paintBase;
        ${
          illustration
            ? `
          float inkNeighbour = max(max(paintA.a,paintB.a),max(paintC.a,paintD.a));
          float inkEdge = clamp((inkNeighbour - paintCenter.a) * 3.0, 0.0, 1.0);
          diffuseColor.rgb = mix(diffuseColor.rgb, worldPigmentInk, inkEdge * .88);
          diffuseColor.a = max(diffuseColor.a, inkNeighbour * inkEdge * .9 * opacity);
        `
            : ""
        }
      #endif
    `,
    );
    if (!illustration)
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <opaque_fragment>",
        `
      float paintShade = max(.001, dot(outgoingLight,vec3(.2126,.7152,.0722)));
      float paintShadeStep = max(.08,floor(paintShade * 7.0 + .5) / 7.0);
      outgoingLight *= mix(1.0, paintShadeStep / paintShade, .12);
      float paintRim = pow(1.0 - abs(dot(normalize(normal),normalize(vViewPosition))),3.0);
      outgoingLight *= 1.0 - paintRim * .12;
      #include <opaque_fragment>
    `,
      );
  };
  material.needsUpdate = true;
  return material;
}
