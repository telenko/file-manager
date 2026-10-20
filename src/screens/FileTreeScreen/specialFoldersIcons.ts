export const SPECIAL_FLDERS_ICONS: { regexp: RegExp; icon: string }[] = [
  { regexp: /DCIM$/, icon: 'camera' },
  { regexp: /Camera$/, icon: 'camera' },
  { regexp: /Photos$/, icon: 'camera' },
  { regexp: /\/Download$/, icon: 'download-box' },
  { regexp: /Documents$/, icon: 'folder-text' },
  { regexp: /Music$/, icon: 'folder-music' },
  { regexp: /Ringtones$/, icon: 'folder-music' },
  { regexp: /Movies$/, icon: 'video' },
  { regexp: /Videos$/, icon: 'video' },
  { regexp: /Pictures$/, icon: 'folder-image' },
  { regexp: /Screenshots$/, icon: 'folder-image' },
  { regexp: /Books$/, icon: 'folder-text' },

  // settings android folders
  //   { regexp: /Android$/, icon: 'folder-wrench' },
  //   { regexp: /data$/, icon: 'folder-wrench' },
  //   { regexp: /obb$/, icon: 'folder-wrench' },
];

export const specialFolderIcon = (path: string): string | undefined => {
  for (const { regexp, icon } of SPECIAL_FLDERS_ICONS) {
    if (regexp.test(path)) {
      return icon;
    }
  }
};
