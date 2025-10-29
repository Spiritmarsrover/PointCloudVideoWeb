

// VIDEO LAYOUT
// GLSL equivalent

const uvec2 VideoResolution = uvec2(80, 45);
const uint ColorTileRadix = 3u;
const uint ColorTileLen   = 2u;
const float tilePow = pow(float(ColorTileRadix), float(ColorTileLen * 3u));

const uvec2 tileCount = VideoResolution / uvec2(ColorTileLen, 1u);
const vec4 tileST = vec4(vec2(1.0, -1.0) / vec2(tileCount), vec2(0.0, 1.0));

vec4 GetTileRect(vec2 uv) {
    return (floor(uv * vec2(tileCount)).xyxy + vec4(0.0, 0.0, 1.0, 1.0)) / vec4(tileCount.xyxy);
}

vec4 GetTileRect(uint idx) {
    return tileST.zwzw + vec4(0.0, 0.0, tileST.xy) + tileST.xyxy * vec4(float(idx / tileCount.y), float(idx % tileCount.y), float(idx / tileCount.y), float(idx % tileCount.y));
}

float GetTileX(uint idx) {
    return tileST.z + tileST.x * 0.5 + tileST.x * float(idx / tileCount.y);
}

float GetTileY(uint idx) {
    return tileST.w + tileST.y * 0.5 + tileST.y * float(idx % tileCount.y);
}

//vec4 layerRect = vec4(0.0, 0.0, GetTileRect(134u).z, 1.0);

// ---------------------------------------------------
// Texture sampling utilities
// ---------------------------------------------------

uniform sampler2D tex;

// optional gamma conversion helpers
vec3 GammaToLinear(vec3 color) {
    return pow(color, vec3(2.2));
}

vec3 LinearToGamma(vec3 color) {
    return pow(color, vec3(1.0 / 2.2));
}

// Assume ColorTile is an array of vec3
// e.g. uniform vec3 ColorTile[ColorTileLen];

//vec4 RenderTile(vec3 c[ColorTileLen], vec2 uv) {
//    vec3 color = (uv.x < 0.5)
//        ? c[0]
//        : c[ColorTileLen - 1];
//    color = GammaToLinear(color);
//    return vec4(color, 1.0);
//}
vec4 RenderTile(vec3 c[ColorTileLen], vec2 uv) {
    vec3 color = (uv.x < 0.5) ? c[0] : c[ColorTileLen - 1u];
    color = GammaToLinear(color);
    return vec4(color, 1.0);
}



//CODEC


// ────────────────────────────────
// sRGB linear ↔ gamma
// ────────────────────────────────
//vec3 LinearToGamma(vec3 color) {
//    return mix(12.92 * color,
//               1.055 * pow(color, vec3(1.0 / 2.4)) - 0.055,
//               step(0.0031308, color));
//}

//vec3 GammaToLinear(vec3 color) {
//    return mix(color / 12.92,
//               pow(color / 1.055 + 0.055 / 1.055, vec3(2.4)),
//               step(0.04045, color));
//}



// ────────────────────────────────
// real number ↔ render-texture color
// ────────────────────────────────
vec4 EncodeBufferSnorm(float x) {
    // uint4(0,8,16,24) → manual constants
    vec4 shift = vec4(0.0, 8.0, 16.0, 24.0);
    vec4 scale = 0.25 * exp2(shift);
    vec4 v = fract(x * scale + scale);
    v.xyz -= v.yzw / exp2(8.0);
    return v / (255.0 / 256.0);
}

float DecodeBufferSnorm(vec4 v) {
    vec4 shift = vec4(0.0, 8.0, 16.0, 24.0);
    vec4 scale = (255.0 / 256.0) / exp2(shift) * 4.0;
    return dot(v, scale) - 1.0;
}


// ────────────────────────────────
// real number ↔ Gray-code coordinates
// ────────────────────────────────
uvec2 gray_decoder_pop(inout uvec2 state, uint radix) {
    uvec2 d = state % radix;
    state /= radix;
    bool odd = any(notEqual(state & 1u, uvec2(0u)));
    return odd ? (uvec2(radix - 1u) - d) : d;
}

void gray_encoder_add(inout vec3 state, float x, uint radix, bool cont) {
    //if (int(state.x) & 1) x = float(radix - 1u) - x;
    if ((int(state.x) & 1) != 0)
      x = float(radix - 1u) - x;
    state.x  = state.x * float(radix) + round(x);
    vec2 xr  = vec2(x) - round(vec2(x));
    if (cont && !(round(x) == 0.0 || round(x) == float(radix - 1u)))
        state.yz = xr;
}

float gray_encoder_sum(vec3 state) {
    vec2 p = max(vec2(0.0), state.zy * vec2(+2.0, -2.0));
    float num = min(p.x, p.y);
    float den = max(max(p.x, p.y) - p.x * p.y, 1e-5);
    float val = (num / den * (p.x - p.y) + (p.x - p.y)) * 0.5 + state.x;
    return val;
}

// ────────────────────────────────
// real number ↔ video color tile
// ────────────────────────────────



//void EncodeVideoSnorm(out vec3 c[ColorTileLen], float x, bool hi) {
//    x = clamp((tilePow - 1.0) / 2.0 * x,
//              (tilePow * tilePow - 1.0) / 2.0 * -1.0,
//              (tilePow * tilePow - 1.0) / 2.0);
//
//    vec2 wt = vec2(1.0 - fract(x), fract(x)) / float(ColorTileRadix - 1u);
//    ivec2 state = ivec2(floor(x)) +
//                  ivec2((tilePow * tilePow - 1.0) / 2.0) +
//                  ivec2(0, 1);
//
//    for (int i = int(ColorTileLen) - 1; i >= 0; --i) {
//        uvec2 d = uvec2(gray_decoder_pop(uvec2(state), ColorTileRadix));
//        c[i].b = dot(vec2(d), wt);
//        d = uvec2(gray_decoder_pop(uvec2(state), ColorTileRadix));
//        c[i].r = dot(vec2(d), wt);
//        d = uvec2(gray_decoder_pop(uvec2(state), ColorTileRadix));
//       c[i].g = dot(vec2(d), wt);
//    }
//
//    if (hi) {
//        for (int i = int(ColorTileLen) - 1; i >= 0; --i) {
//           uvec2 d = uvec2(gray_decoder_pop(uvec2(state), ColorTileRadix));
//            c[i].b = dot(vec2(d), wt);
//           d = uvec2(gray_decoder_pop(uvec2(state), ColorTileRadix));
//            c[i].r = dot(vec2(d), wt);
//            d = uvec2(gray_decoder_pop(uvec2(state), ColorTileRadix));
//            c[i].g = dot(vec2(d), wt);
//        }
//    }
//}

void EncodeVideoSnorm(out vec3 c[ColorTileLen], float x, bool hi) {
    x = clamp((tilePow - 1.0) / 2.0 * x,
              ((tilePow * tilePow - 1.0) / 2.0) * -1.0,
              (tilePow * tilePow - 1.0) / 2.0);

    vec2 wt = vec2(1.0 - fract(x), fract(x)) / float(ColorTileRadix - 1u);
    ivec2 state = ivec2(floor(x)) +
                  ivec2(((tilePow * tilePow) - 1.0) / 2.0) +
                  ivec2(0, 1);

    // make a working copy for gray_decoder_pop
    uvec2 s = uvec2(state);

    for (int i = int(ColorTileLen) - 1; i >= 0; --i) {
        uvec2 d = gray_decoder_pop(s, ColorTileRadix);
        c[i].b = dot(vec2(d), wt);

        d = gray_decoder_pop(s, ColorTileRadix);
        c[i].r = dot(vec2(d), wt);

        d = gray_decoder_pop(s, ColorTileRadix);
        c[i].g = dot(vec2(d), wt);
    }

    if (hi) {
        for (int i = int(ColorTileLen) - 1; i >= 0; --i) {
            uvec2 d = gray_decoder_pop(s, ColorTileRadix);
            c[i].b = dot(vec2(d), wt);

            d = gray_decoder_pop(s, ColorTileRadix);
            c[i].r = dot(vec2(d), wt);

            d = gray_decoder_pop(s, ColorTileRadix);
            c[i].g = dot(vec2(d), wt);
        }
    }

    // optionally copy back to signed version if you need it later
    state = ivec2(s);
}



float DecodeVideoSnorm(vec3 c[ColorTileLen]) {
    vec3 state = vec3(0.0);
    for (int i = 0; i < int(ColorTileLen); ++i) {
        c[i] *= float(ColorTileRadix - 1u);
        gray_encoder_add(state, c[i].g, ColorTileRadix, true);
        gray_encoder_add(state, c[i].r, ColorTileRadix, true);
        gray_encoder_add(state, c[i].b, ColorTileRadix, true);
    }
    return gray_encoder_sum(vec3(state.x - (tilePow - 1.0) / 2.0, state.yz)) / ((tilePow - 1.0) / 2.0);
}

float DecodeVideoFloat(float hi, float lo) {
    vec2 hilo = (tilePow - 1.0) / 2.0 + (tilePow - 1.0) / 2.0 * vec2(hi, lo);
    vec3 state = vec3(0.0);
    gray_encoder_add(state, hilo.x, uint(tilePow), false);
    gray_encoder_add(state, hilo.y, uint(tilePow), true);
    return gray_encoder_sum(vec3(state.x - (tilePow * tilePow - 1.0) / 2.0, state.yz))
           / ((tilePow - 1.0) / 2.0);
}

struct ColorTile {
    vec3 tex0; // encoded[0].rgb
    vec3 tex1; // encoded[1].rgb
};
uniform sampler2D map;
uniform float _PosX;
uniform float _PosY;
uniform float _PosZ;
uniform float _QuaterionX;
uniform float _QuaterionY;
uniform float _QuaterionZ;
uniform float _QuaterionW;
uniform float _FOVSIZE;
uniform float _NEAR;
uniform float _FAR;
uniform float _isOrtho;
int _VisibleSlotCount = 135;
varying vec2 vUv;
void main(){



    const int cols = 2;
    const int rows = 45;
    const float slotWidth = 0.16667;
    const float slotHeight = 1.0 / float(rows);

    vec2 localUV = vUv;

    int col = int(localUV.x / (2.0 * slotWidth));
    int row = int((1.0 - localUV.y) / slotHeight);
    int slotIndex = col * rows + row;

    vec2 inSlotUV = vec2(mod(localUV.x, 2.0 * slotWidth),
                         mod(localUV.y, slotHeight));
    bool inSquare = inSlotUV.x < slotWidth * 2.0;
    bool inLeftTile = inSlotUV.x < slotWidth;

    //bool isLeft = false;
    if(localUV.x>0.5){
        inLeftTile = false;
    }else{
        inLeftTile = true;
    }
    slotIndex = int((1.0-localUV.y)*45.0);

    if (slotIndex < _VisibleSlotCount && inSquare)
    {
        float data = 0.0;
        bool lowPart = true;
        //ColorTile encoded;
        vec3 encoded[ColorTileLen];

        // Map each slotIndex to a uniform
        if (slotIndex == 0) { data = _PosX/2.0 ; lowPart = true; }
        else if (slotIndex == 1) { data = _PosY/2.0 ; lowPart = true; }
        else if (slotIndex == 2) { data = _PosZ/2.0 ; lowPart = true; }
        else if (slotIndex == 3) { data = _PosX/2.0 ; lowPart = false; }
        else if (slotIndex == 4) { data = _PosY/2.0 ; lowPart = false; }
        else if (slotIndex == 5) { data = _PosZ/2.0 ; lowPart = false; }
        else if (slotIndex == 6) { data = _QuaterionX; lowPart = false; }
        else if (slotIndex == 7) { data = _QuaterionY; lowPart = false; }
        else if (slotIndex == 8) { data = _QuaterionZ; lowPart = false; }
        else if (slotIndex == 9) { data = _QuaterionW; lowPart = false; }
        else if (slotIndex == 10) { data = _FOVSIZE; lowPart = true; }
        else if (slotIndex == 11) { data = _FOVSIZE; lowPart = false; }
        else if (slotIndex == 12) { data = _NEAR; lowPart = true; }
        else if (slotIndex == 13) { data = _NEAR; lowPart = false; }
        else if (slotIndex == 14) { data = _FAR; lowPart = true; }
        else if (slotIndex == 15) { data = _FAR; lowPart = false; }
        else if (slotIndex == 16) { data = _isOrtho; lowPart = false; }
        else { gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0); return; }

        EncodeVideoSnorm(encoded, data, lowPart);

        vec3 outColor = inLeftTile ? encoded[0] : encoded[1];
        gl_FragColor = vec4(outColor.rgb,1.0);
        //gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);


        return;
    }else{
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
    }

    //gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);

    //gl_FragColor = vec4(0.0,0.0,0.0, 0.0);
}