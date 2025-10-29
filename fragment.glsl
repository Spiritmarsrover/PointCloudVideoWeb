uniform sampler2D map;
varying vec2 vUv;

vec3 GammaToLinear(vec3 color) {
    return pow(color, vec3(2.2));
}

vec3 LinearToGamma(vec3 color) {
    return pow(color, vec3(1.0 / 2.2));
}

void main() {
  vec4 color = texture2D(map, vUv);
  gl_FragColor = vec4(LinearToGamma(color.rgb), 1.0);
  //gl_FragColor = vec4(color.rgb, 1.0);
}