uniform sampler2D map;
uniform float width;
uniform float height;
uniform float nearClipping, farClipping;
uniform float pointSize;
uniform float zOffset;
uniform float scale;
uniform float UseDecodedPosition;
uniform float _UseDecodedRotation;
uniform float _UseDecodedDepthRange;
uniform float _UseDecodedFocal;
int _NEARhiSlot;
int _NEARloSlot;
int _FARhiSlot;
int _FARloSlot;
float _Far;
float _Near;
float FOVSIZE;
float _Ortho;
vec4 _MainTex_ST;
uniform vec4 mapTransform; // same as _MainTex_ST
float _TileEncodingGamma = 0.0;
const uint _XPosSlot = 0u;
const uint _YPosSlot = 1u;
const uint _ZPosSlot = 2u;
varying vec2 vUv;

const float XtoZ = 1.11146;
const float YtoZ = 0.83359;

vec4 layerRect;

// VIDEO LAYOUT
// GLSL equivalent

const uvec2 VideoResolution = uvec2(80, 45);
const uint ColorTileLen = 2u; // define this somewhere

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
uniform vec3 ColorTile[ColorTileLen];
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

void SampleTile(out vec3 c[ColorTileLen], sampler2D tex, vec4 rect, bool sampleGamma) {
    for (int i = 0; i < int(ColorTileLen); i++) {
        vec2 sampleUV = mix(rect.xy, rect.zw, vec2((float(i) + 0.5) / float(ColorTileLen), 0.5));
        vec3 color = textureLod(tex, sampleUV, 0.0).rgb;
        if (!sampleGamma)
            color = LinearToGamma(color);
        c[i] = color;
    }
}

//CODEC
precision highp float;
precision highp int;
precision highp sampler2D;

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

// If working in gamma color space, disable conversion
#ifdef UNITY_COLORSPACE_GAMMA
#define LinearToGamma(x) (x)
#define GammaToLinear(x) (x)
#endif

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

// WebGL can't use R32F
#ifdef SHADER_API_WEBGL
#define EncodeBufferSnorm(x) vec4(x)
#define DecodeBufferSnorm(x) (x).r
#endif

// ────────────────────────────────
// real number ↔ Gray-code coordinates
// ────────────────────────────────
uvec2 gray_decoder_pop(inout uvec2 state, uint radix) {
    uvec2 d = state % radix;
    state /= radix;
    return (state & 1u) != uvec2(0u) ? uvec2(radix - 1u) - d : d;
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
const uint ColorTileRadix = 3u;
//const uint ColorTileLen   = 2u;
const float tilePow = pow(float(ColorTileRadix), float(ColorTileLen * 3u));

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
              (tilePow * tilePow - 1.0) / 2.0 * -1.0,
              (tilePow * tilePow - 1.0) / 2.0);

    vec2 wt = vec2(1.0 - fract(x), fract(x)) / float(ColorTileRadix - 1u);
    ivec2 state = ivec2(floor(x)) +
                  ivec2((tilePow * tilePow - 1.0) / 2.0) +
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
    return gray_encoder_sum(vec3(state.x - (tilePow * tilePow - 1.0) / 2.0, state.yz)) / ((tilePow - 1.0) / 2.0);
}
float DecodeLoopHSV2(vec3 c)
				{
					float e = 0.1; // Expanded tolerance radius
					float v = -1.0;

					if (c.r > 0.9 && c.b < 0.1 && c.g <0.9)			//(1,0,0) -> (1,1,0)
					{
						v = c.g / (0.9*6.0);
					}
					else if (c.g > 0.9 && c.b < 0.1 && c.r > 0.1)	//(1,1,0) -> (0,1,0)
					{
						v = (1.0 - c.r) / (0.9 * 6.0) + (1.0 / 6.0);
					}
					else if (c.r < 0.1 && c.g > 0.9 && c.b < 0.9)	//(0,1,0) -> (0,1,1)
					{
						v = (c.b) / (0.9 * 6.0) + (2.0 / 6.0);
					}
					else if (c.r < 0.1 && c.g > 0.1 && c.b > 0.9)	//(0,1,1) -> (0,0,1)
					{
						v = (1.0 - c.g) / (0.9 * 6.0) + (3.0 / 6.0);
					}
					else if (c.r < 0.9 && c.g < 0.1 && c.b > 0.9)	//(0,0,1) -> (1,0,1)
					{
						v = ( c.r) / (0.9 * 6.0) + (4.0 / 6.0);
					}
					else if (c.r > 0.9 && c.g < 0.1 && c.b > 0.1)	//(1,0,1) -> (1,0,0)
					{
						v = (1.0 - c.b) / (0.9 * 6.0) + (5.0 / 6.0);
					}
					return 1.0 - clamp(v,0.0,1.0);
				}

float DecodePositionFromSlot(uint slotIdx) {
    // Get the tile rectangle for this slot
    vec4 rect = GetTileRect(slotIdx);

    // Sample the tile colors
    vec3 c[ColorTileLen];
    //SampleTile(c, map, rect * mapTransform.xyxy + mapTransform.zwzw, _TileEncodingGamma > 0.5);
    SampleTile(c, map, rect , _TileEncodingGamma > 0.5);

    // Decode the value (-1 to 1 range)
    return DecodeVideoSnorm(c);
}
vec3 RotateVectorByQuaternion(vec3 v, vec4 q)
{
    // q = (x, y, z, w)
    q = vec4(-q.x, -q.y, q.z, q.w);
    vec3 qv = q.xyz;
    float qs = q.w;

    // Formula: v' = v + 2 * cross(qv, cross(qv, v) + qs * v)
    return v + 2.0 * cross(qv, cross(qv, v) + qs * v);
}

void main() {
  //VIDEO LAYOUT
  vec4 rotationQ = vec4(0.0, 0.0, 0.0, 1.0);
  layerRect = vec4(0.0, 0.0, GetTileRect(134u).z, 1.0);

  vUv = vec2(position.x / width, 0.5 + position.y / height*0.5);

  vec2 depthUv = vec2(position.x / width, position.y / height * 0.5);
  vec4 depthColor = texture2D(map, depthUv);

  vec4 color = texture2D(map, vUv);
  //float depth = (color.r + color.g + color.b) / 3.0;
  //float depth = -(depthColor.r + depthColor.g + depthColor.b) / 3.0;//bw decode
  //hsv2 decode
  float depth = DecodeLoopHSV2(depthColor.rgb);
  if(depth>0.999){
    return;
  }

    float kernelsize = 0.0001;
    float leftDepth = DecodeLoopHSV2(texture2D(map, depthUv+vec2(-kernelsize,0.0)).rgb);
    float rightDepth = DecodeLoopHSV2(texture2D(map, depthUv+vec2(kernelsize,0.0)).rgb);
    float upDepth = DecodeLoopHSV2(texture2D(map, depthUv+vec2(0.0,kernelsize)).rgb);
    float downDepth = DecodeLoopHSV2(texture2D(map, depthUv+vec2(0.0,-kernelsize)).rgb);

    float maxDiff = max(abs(depth - leftDepth),max(abs(depth - rightDepth),max(abs(depth - upDepth), abs(depth - downDepth))));
    if (maxDiff > 0.1)
    {
	    return;
    }

  vec3 posOffset = vec3(0.0,0.0,0.0);
  _Ortho = DecodePositionFromSlot(16u);
  if(UseDecodedPosition>=0.5)
  {
    float highx = DecodePositionFromSlot(_XPosSlot);
    float lowx = DecodePositionFromSlot(_XPosSlot+3u);
    //slots 1 and 4 define y high and low floats
    float highy = DecodePositionFromSlot(_YPosSlot);
    float lowy = DecodePositionFromSlot(_YPosSlot+3u);
    //slots 2 and 5 define z high and low floats
    float highz = DecodePositionFromSlot(_ZPosSlot);
    float lowz = DecodePositionFromSlot(_ZPosSlot+3u);
    //get the actual floats from the encode (+-1430 or 730?)
    float xPos = DecodeVideoFloat(highx, lowx);
    float yPos = DecodeVideoFloat(highy, lowy);
    float zPos = DecodeVideoFloat(highz, lowz);
    // Decode position from slots 1-3
    posOffset = vec3(xPos, yPos, zPos)*2.0;// *posScale * _PositionConstant;//no need for these i think
  }
    if (_UseDecodedRotation > 0.5) {
    float qx = DecodePositionFromSlot(6u);
    float qy = DecodePositionFromSlot(7u);
    float qz = DecodePositionFromSlot(8u);
    float qw = DecodePositionFromSlot(9u);

    // Normalize the quaternion
    float qLen = sqrt(qx*qx + qy * qy + qz * qz + qw * qw);
    if (qLen > 0.0001) {
        rotationQ = vec4(qx / qLen, qy / qLen, qz / qLen, qw / qLen);
        }
    }
    if (_UseDecodedDepthRange > 0.5) {
	    float decodedNearhi = DecodePositionFromSlot(12u);
	    float decodedNearlo = DecodePositionFromSlot(13u);
						  
	    float decodedFarhi = DecodePositionFromSlot(14u);
	    float decodedFarlo = DecodePositionFromSlot(15u);

	    _Near = DecodeVideoFloat(decodedNearhi, decodedNearlo);
	    _Far = DecodeVideoFloat(decodedFarhi, decodedFarlo);
	}
    
  //persepective by focal ratio
  //vec4 pos = vec4(
  // (position.x / width - 0.5) * z * XtoZ*scale,
  //  (position.y / height - 0.5) * z * YtoZ*scale,
  //  -z + zOffset,
  //  1.0
  //);
if (_UseDecodedFocal > 0.5) {
    float decodedFOVSIZEhi = DecodePositionFromSlot(10u);
    float decodedFOVSIZElo = DecodePositionFromSlot(11u);
    FOVSIZE = DecodeVideoFloat(decodedFOVSIZEhi, decodedFOVSIZElo);
     
}
  vec4 pos = vec4(0.0,0.0,0.0,1.0);

// Transform to world space
vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;

// Calculate distance to camera for point size scaling
vec3 viewDir = worldPos - cameraPosition;
float distToCam = length(viewDir);

  if(_Ortho>0.5){
    //Ortho projection
  vec2 ndc = vUv * 2.0 - 1.0;
  ndc.y = ndc.y-0.5;

  float viewHeight = FOVSIZE * 4.0;     // or _OrthoSize * 2.0
  float viewWidth  = viewHeight * 0.888888888888;//wiewHeight is already in what aspect the video is. 

  //vec4 pos = vec4( ndc.x * 0.5 * viewWidth, ndc.y * 0.5 * viewHeight,-z, 1.0 );
  
  pos.x = ndc.x * 0.5 * viewWidth;
  pos.y = ndc.y * 0.5 * viewHeight;
  
  pos.z = -mix(_Near,_Far,depth);//z;//LinearEyeDepthOrtho(depthCOPE, near, far);
  //float z = (depth) * (_Far - _Near) + _Near;
  //pos.z = -z;
  
  }else{
    //persepctive by FOV
    float z = (1.0 - depth) * (_Far - _Near) + _Near;
  vec2 ndc = vUv * 2.0 - 1.0;
  float yScale = tan(0.775 * 0.5);
  float xScale = yScale * 1.7777777;
  vec3 viewDir1 = vec3(ndc.x * xScale, ndc.y * yScale, 1.0);
  //pos = viewDir1 * z;
  pos = vec4(viewDir1.x*z,viewDir1.y*z,z*-1.0,1);
  }
  


  

  if(_UseDecodedRotation>0.5){
    pos = vec4(RotateVectorByQuaternion(pos.xyz,rotationQ),1.0);
  }
   posOffset.z = -posOffset.z;
  vec4 posFinal = (pos+vec4(posOffset.xyz,0.0));
  float dist = length((modelViewMatrix * vec4(posFinal.xyz, 1.0)).xyz);
  gl_PointSize = 2.5 * (projectionMatrix[1][1] / dist);
  //gl_PointSize =FOVSIZE/(distToCam*distToCam);
  //gl_PointSize = pointSize;
  //gl_Position = projectionMatrix * modelViewMatrix * pos;
 
  gl_Position = projectionMatrix * modelViewMatrix * posFinal;
}
