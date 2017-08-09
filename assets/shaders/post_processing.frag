#version 330

uniform sampler2D	u_texInput;
uniform sampler2D	u_texLUT;
uniform float     u_mixAmount;

in vec2 vTexCoord0;

out vec4 oColor;

vec4 lookup( vec4 texture_color, sampler2D lookup_table ) {
#ifndef LUT_NO_CLAMP
    texture_color = clamp( texture_color, 0.0, 1.0 );
#endif

    mediump float blueColor = texture_color.b * 63.0;

    mediump vec2 quad1;
    quad1.y = floor( floor( blueColor ) / 8.0);
    quad1.x = floor( blueColor ) - ( quad1.y * 8.0 );

    mediump vec2 quad2;
    quad2.y = floor( ceil( blueColor ) / 8.0);
    quad2.x = ceil( blueColor ) - ( quad2.y * 8.0 );

    highp vec2 texPos1;
    texPos1.x = ( quad1.x * 0.125 ) + 0.5/512.0 + ( ( 0.125 - 1.0/512.0 ) * texture_color.r );
    texPos1.y = ( quad1.y * 0.125 ) + 0.5/512.0 + ( ( 0.125 - 1.0/512.0 ) * texture_color.g );

#ifdef LUT_FLIP_Y
    texPos1.y = 1.0-texPos1.y;
#endif

    highp vec2 texPos2;
    texPos2.x = ( quad2.x * 0.125 ) + 0.5/512.0 + ( ( 0.125 - 1.0/512.0 ) * texture_color.r );
    texPos2.y = ( quad2.y * 0.125 ) + 0.5/512.0 + ( ( 0.125 - 1.0/512.0 ) * texture_color.g );

#ifdef LUT_FLIP_Y
    texPos2.y = 1.0-texPos2.y;
#endif

    lowp vec4 newColor1 = texture( lookup_table, texPos1 );
    lowp vec4 newColor2 = texture( lookup_table, texPos2 );

    lowp vec4 newColor = mix( newColor1, newColor2, fract( blueColor ) );
    return newColor;
}

void main()
{
  vec4 color = texture( u_texInput, vTexCoord0 );
  vec4 newColor = lookup( color, u_texLUT );
	oColor = mix( color, newColor, u_mixAmount );  
}
