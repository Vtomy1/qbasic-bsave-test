import dosAdventureScene from '../assets/images/dos_adventure_scene_1790472508679.jpg';
import retroCyberpunkMech from '../assets/images/retro_cyberpunk_mech_1790472518942.jpg';
import vintageTonalPortrait from '../assets/images/vintage_tonal_portrait_1790472528820.jpg';

export interface SampleItem {
  id: string;
  name: string;
  category: string;
  description: string;
  imagePath: string;
  recommendedMode: 'SCREEN_13' | 'SCREEN_7' | 'SCREEN_1' | 'SCREEN_2';
  recommendedDither: 'floyd_steinberg' | 'atkinson' | 'bayer_4x4' | 'none';
}

export const SAMPLE_IMAGES: SampleItem[] = [
  {
    id: 'dos_adventure',
    name: 'DOS Adventure Scene',
    category: 'VGA 256 / 16 Color',
    description: 'LucasArts & Sierra 90s graphic adventure style castle courtyard.',
    imagePath: dosAdventureScene,
    recommendedMode: 'SCREEN_13',
    recommendedDither: 'floyd_steinberg'
  },
  {
    id: 'cyberpunk_mech',
    name: 'Cyberpunk Mech Hangar',
    category: 'VGA / EGA Sci-Fi',
    description: '1990s retro PC cutscene pixel art with glowing CRT panels and robots.',
    imagePath: retroCyberpunkMech,
    recommendedMode: 'SCREEN_7',
    recommendedDither: 'bayer_4x4'
  },
  {
    id: 'tonal_portrait',
    name: 'Classical Tonal Sculpture',
    category: 'Dithering Benchmark',
    description: 'Fine marble portrait with continuous shadow gradients, ideal for testing dither algorithms.',
    imagePath: vintageTonalPortrait,
    recommendedMode: 'SCREEN_2',
    recommendedDither: 'atkinson'
  }
];
