
export enum TextureAlias {
    particle = 'particle',
    blade_alpha = 'blade_alpha',
    blade_diffuse = 'blade_diffuse',
    perlinFbm = 'perlinFbm'
};

/**
 * Parent dirrectory is ./assets/textures/
 */
export const TEXTURE_LOAD_LIST = [
    { alias: TextureAlias.particle, file: 'particles/circle.png' },
    { alias: TextureAlias.blade_alpha, file: 'blade_alpha.jpg' },
    { alias: TextureAlias.blade_diffuse, file: 'blade_diffuse.jpg' },
    { alias: TextureAlias.perlinFbm, file: 'perlinFbm.jpg' },
];
